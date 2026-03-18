import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get total accounts
    const { count: totalAccounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true });

    if (accountsError) throw accountsError;

    // Get active accounts (not expired)
    const { count: activeAccounts, error: activeError } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .or('data_expiracao.is.null,data_expiracao.gte.now()');

    if (activeError) throw activeError;

    // Get trial accounts
    const { count: trialAccounts, error: trialError } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'trial');

    if (trialError) throw trialError;

    // Get expired accounts
    const { count: expiredAccounts, error: expiredError } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .lt('data_expiracao', new Date().toISOString())
      .not('data_expiracao', 'is', null);

    if (expiredError) throw expiredError;

    // Get total revenue (sum of all payments)
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('amount_cents')
      .eq('status', 'paid');

    if (paymentsError) throw paymentsError;

    const totalRevenue = paymentsData?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;

    // Get revenue this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: monthPayments, error: monthError } = await supabase
      .from('payments')
      .select('amount_cents')
      .eq('status', 'paid')
      .gte('created_at', firstDayOfMonth.toISOString());

    if (monthError) throw monthError;

    const monthlyRevenue = monthPayments?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;

    // Get recent payments (last 5)
    const { data: recentPayments, error: recentError } = await supabase
      .from('payments')
      .select(`
        id,
        amount_cents,
        status,
        created_at,
        user_id,
        plan_id
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    // Get total properties
    const { count: totalProperties, error: propertiesError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    if (propertiesError) throw propertiesError;

    // Get total contracts
    const { count: totalContracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true });

    if (contractsError) throw contractsError;

    // Get accounts created this month
    const { count: newAccountsThisMonth, error: newAccountsError } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString());

    if (newAccountsError) throw newAccountsError;

    console.log('Admin stats generated successfully', {
      totalAccounts,
      activeAccounts,
      totalRevenue: totalRevenue / 100,
      monthlyRevenue: monthlyRevenue / 100
    });

    return new Response(
      JSON.stringify({
        accounts: {
          total: totalAccounts || 0,
          active: activeAccounts || 0,
          trial: trialAccounts || 0,
          expired: expiredAccounts || 0,
          newThisMonth: newAccountsThisMonth || 0
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue
        },
        recentPayments: recentPayments || [],
        stats: {
          totalProperties: totalProperties || 0,
          totalContracts: totalContracts || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin stats error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
