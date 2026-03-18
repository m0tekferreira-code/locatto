import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaktoWebhookPayload {
  type: string;
  tx_id: string;
  event_id?: string;
  amount_cents: number;
  email: string;
  plan_name?: string;
  occurred_at?: string;
  [key: string]: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Cakto webhook received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: CaktoWebhookPayload = await req.json();
    console.log('Webhook payload:', { type: payload.type, tx_id: payload.tx_id, email: payload.email, amount: payload.amount_cents });

    // Idempotency check
    const eventId = payload.event_id || `cakto:${payload.tx_id}`;
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingPayment) {
      console.log('Event already processed:', eventId);
      return new Response(JSON.stringify({ message: 'Event already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find user by email
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users.find(u => u.email === payload.email);

    if (!user) {
      console.error('User not found for email:', payload.email);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User found:', user.id);

    // Find plan by name (if provided)
    let plan = null;
    if (payload.plan_name) {
      const { data: planData } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('name', payload.plan_name)
        .maybeSingle();
      plan = planData;
    }

    // If no plan found by name, try to match by amount
    if (!plan) {
      const { data: planData } = await supabase
        .from('billing_plans')
        .select('*')
        .gte('price_cents', payload.amount_cents - Math.floor(payload.amount_cents * 0.01))
        .lte('price_cents', payload.amount_cents + Math.floor(payload.amount_cents * 0.01))
        .maybeSingle();
      plan = planData;
    }

    if (!plan) {
      console.warn('No matching plan found for amount:', payload.amount_cents);
    } else {
      console.log('Plan identified:', { id: plan.id, name: plan.name });
      
      // Validate amount with 1% tolerance
      const tolerance = Math.floor(plan.price_cents * 0.01);
      const isValidAmount = Math.abs(payload.amount_cents - plan.price_cents) <= tolerance;
      
      if (!isValidAmount) {
        console.warn('Amount mismatch:', { expected: plan.price_cents, received: payload.amount_cents });
      }
    }

    // Determine payment status
    const paymentStatus = payload.type === 'payment.paid' ? 'paid' : 
                         payload.type === 'payment.refunded' ? 'refunded' : 
                         'pending';

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        event_id: eventId,
        external_tx_id: payload.tx_id,
        user_id: user.id,
        plan_id: plan?.id || null,
        amount_cents: payload.amount_cents,
        currency: 'BRL',
        status: paymentStatus,
        raw: payload,
        provider: 'cakto'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment:', paymentError);
      return new Response(JSON.stringify({ error: 'Failed to create payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Payment created:', payment.id);

    // Update license if payment is confirmed
    if (payload.type === 'payment.paid' && plan) {
      console.log('Updating user license');

      // Get current expiration
      const { data: profile } = await supabase
        .from('profiles')
        .select('data_expiracao')
        .eq('id', user.id)
        .single();

      const currentExpiration = profile?.data_expiracao ? new Date(profile.data_expiracao) : new Date();
      const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
      const newExpiration = new Date(baseDate);
      newExpiration.setDate(newExpiration.getDate() + plan.days_duration);

      console.log('License update:', {
        current: profile?.data_expiracao,
        new: newExpiration.toISOString(),
        days_added: plan.days_duration
      });

      // Update profile expiration
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ data_expiracao: newExpiration.toISOString() })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update license:', updateError);
      } else {
        console.log('License updated successfully');

        // Create audit record
        await supabase.from('license_audit').insert({
          user_id: user.id,
          previous_expiration: profile?.data_expiracao,
          new_expiration: newExpiration.toISOString(),
          source: 'webhook:cakto',
          ref_payment_id: payment.id
        });

        // Update checkout session status
        const { data: recentSession } = await supabase
          .from('checkout_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('plan_id', plan.id)
          .in('status', ['created', 'redirected'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentSession) {
          await supabase
            .from('checkout_sessions')
            .update({ status: 'paid' })
            .eq('id', recentSession.id);
          
          console.log('Checkout session updated:', recentSession.id);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      payment_id: payment.id,
      message: 'Webhook processed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
