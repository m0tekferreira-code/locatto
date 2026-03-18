import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Contract {
  id: string;
  property_id: string;
  rental_value: number;
  payment_day: number;
  start_date: string;
  end_date: string | null;
  status: string;
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contract_id } = await req.json();

    if (!contract_id) {
      throw new Error('contract_id é obrigatório');
    }

    console.log('🔄 Gerando lançamentos para contrato:', contract_id);

    // Buscar dados do contrato
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract_id)
      .single();

    if (contractError) {
      console.error('Erro ao buscar contrato:', contractError);
      throw contractError;
    }

    if (!contract) {
      throw new Error('Contrato não encontrado');
    }

    // Calcular número de meses do contrato
    const startDate = new Date(contract.start_date);
    const endDate = contract.end_date ? new Date(contract.end_date) : null;
    
    // Se não tem data final, gera 12 meses (padrão)
    const monthsToGenerate = endDate 
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 12;

    console.log(`📅 Gerando ${monthsToGenerate} lançamentos de aluguel`);

    const lancamentos = [];
    const paymentDay = contract.payment_day || 5;

    for (let i = 0; i < monthsToGenerate; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i);
      dueDate.setDate(paymentDay);

      // Verificar se já existe lançamento para este mês
      const { data: existing } = await supabase
        .from('lancamentos_financeiros')
        .select('id')
        .eq('id_contrato', contract_id)
        .eq('data_vencimento', dueDate.toISOString().split('T')[0])
        .maybeSingle();

      if (existing) {
        console.log(`⏭️ Lançamento já existe para ${dueDate.toISOString().split('T')[0]}`);
        continue;
      }

      lancamentos.push({
        user_id: contract.user_id,
        id_imovel: contract.property_id,
        id_contrato: contract.id,
        tipo: 'receita',
        categoria: 'Aluguel',
        descricao: `Aluguel referente a ${dueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        valor: contract.rental_value,
        data_vencimento: dueDate.toISOString().split('T')[0],
        status: 'pendente',
      });
    }

    if (lancamentos.length === 0) {
      console.log('ℹ️ Nenhum lançamento novo a ser criado');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Todos os lançamentos já existem',
          created: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Inserir lançamentos em lote
    const { data: inserted, error: insertError } = await supabase
      .from('lancamentos_financeiros')
      .insert(lancamentos)
      .select();

    if (insertError) {
      console.error('Erro ao inserir lançamentos:', insertError);
      throw insertError;
    }

    console.log(`✅ ${inserted.length} lançamentos criados com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        created: inserted.length,
        lancamentos: inserted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});