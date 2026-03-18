import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Invoice {
  id: string;
  invoice_number: string;
  due_date: string;
  total_amount: number;
  status: string;
  property_id: string;
  user_id: string;
  reference_month: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  owner_name: string;
  owner_contact: string;
  owner_email: string;
}

interface Profile {
  id: string;
  full_name: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Verificando faturas para notificações...');

    // Data atual
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Data daqui a 3 dias (para avisos antecipados)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    // Buscar faturas vencidas (status pending e due_date < hoje)
    const { data: overdueInvoices, error: overdueError } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'pending')
      .lt('due_date', todayStr);

    if (overdueError) {
      console.error('Erro ao buscar faturas vencidas:', overdueError);
      throw overdueError;
    }

    // Buscar faturas próximas do vencimento (status pending e due_date entre hoje e 3 dias)
    const { data: upcomingInvoices, error: upcomingError } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'pending')
      .gte('due_date', todayStr)
      .lte('due_date', threeDaysStr);

    if (upcomingError) {
      console.error('Erro ao buscar faturas próximas do vencimento:', upcomingError);
      throw upcomingError;
    }

    console.log(`📊 Encontradas ${overdueInvoices?.length || 0} faturas vencidas`);
    console.log(`📊 Encontradas ${upcomingInvoices?.length || 0} faturas próximas do vencimento`);

    const notifications = [];

    // Processar faturas vencidas
    if (overdueInvoices && overdueInvoices.length > 0) {
      for (const invoice of overdueInvoices) {
        const notification = await prepareNotification(supabase, invoice, 'overdue');
        if (notification) {
          notifications.push(notification);
        }
      }
    }

    // Processar faturas próximas do vencimento
    if (upcomingInvoices && upcomingInvoices.length > 0) {
      for (const invoice of upcomingInvoices) {
        const notification = await prepareNotification(supabase, invoice, 'upcoming');
        if (notification) {
          notifications.push(notification);
        }
      }
    }

    // Enviar notificações para n8n
    if (notifications.length > 0) {
      console.log(`📤 Enviando ${notifications.length} notificações para n8n...`);
      
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifications,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!n8nResponse.ok) {
        console.error('Erro ao enviar para n8n:', await n8nResponse.text());
        throw new Error(`n8n webhook error: ${n8nResponse.status}`);
      }

      console.log('✅ Notificações enviadas com sucesso!');
    } else {
      console.log('ℹ️ Nenhuma notificação para enviar');
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdueCount: overdueInvoices?.length || 0,
        upcomingCount: upcomingInvoices?.length || 0,
        notificationsSent: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function prepareNotification(
  supabase: any,
  invoice: Invoice,
  type: 'overdue' | 'upcoming'
) {
  try {
    // Buscar dados do imóvel
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', invoice.property_id)
      .maybeSingle();

    if (propertyError) {
      console.error('Erro ao buscar imóvel:', propertyError);
      return null;
    }

    // Buscar dados do usuário (proprietário da plataforma)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', invoice.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError);
      return null;
    }

    // Calcular dias de atraso (se vencida)
    const daysOverdue = type === 'overdue' 
      ? Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calcular dias até o vencimento (se próxima)
    const daysUntilDue = type === 'upcoming'
      ? Math.floor((new Date(invoice.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      type, // overdue ou upcoming
      invoice: {
        id: invoice.id,
        number: invoice.invoice_number,
        dueDate: invoice.due_date,
        amount: invoice.total_amount,
        referenceMonth: invoice.reference_month,
        daysOverdue,
        daysUntilDue,
      },
      property: {
        id: property?.id,
        name: property?.name,
        address: property?.address,
        ownerName: property?.owner_name,
        ownerContact: property?.owner_contact,
        ownerEmail: property?.owner_email,
      },
      recipient: {
        userId: invoice.user_id,
        name: profile?.full_name,
      },
    };
  } catch (error) {
    console.error('Erro ao preparar notificação:', error);
    return null;
  }
}