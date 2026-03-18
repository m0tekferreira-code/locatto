import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  user_id: string;
  days_to_add: number;
  payment_method?: string;
  payment_id?: string;
  amount?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Payment webhook received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    console.log('Webhook payload:', { ...payload, amount: payload.amount });

    // Validate required fields
    if (!payload.user_id || !payload.days_to_add) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing user_id or days_to_add' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current expiration date
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('data_expiracao')
      .eq('id', payload.user_id)
      .single();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new expiration date
    const currentDate = profile.data_expiracao 
      ? new Date(profile.data_expiracao) 
      : new Date();
    
    // If current date is in the past, start from now
    const baseDate = currentDate > new Date() ? currentDate : new Date();
    const newExpirationDate = new Date(baseDate);
    newExpirationDate.setDate(newExpirationDate.getDate() + payload.days_to_add);

    console.log('Updating expiration:', {
      old: profile.data_expiracao,
      new: newExpirationDate.toISOString()
    });

    // Update expiration date
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ data_expiracao: newExpirationDate.toISOString() })
      .eq('id', payload.user_id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update license' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('License updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_expiration: newExpirationDate.toISOString(),
        message: 'License extended successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
