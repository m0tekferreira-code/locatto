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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ valid: false, expires_at: null }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ valid: false, expires_at: null }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Super admin always has valid license
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id });
    if (isSuperAdmin) {
      return new Response(
        JSON.stringify({ valid: true, expires_at: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's account_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.account_id) {
      // Fallback: check profile.data_expiracao for legacy users
      const { data: legacyProfile } = await supabase
        .from('profiles')
        .select('data_expiracao')
        .eq('id', user.id)
        .single();

      const expiresAt = legacyProfile?.data_expiracao;
      const isValid = expiresAt === null ? true : new Date(expiresAt) >= new Date();
      return new Response(
        JSON.stringify({ valid: isValid, expires_at: expiresAt || null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check account's license (source of truth)
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('data_expiracao, subscription_status')
      .eq('id', profile.account_id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ valid: false, expires_at: null }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresAt = account.data_expiracao;
    // No expiration = perpetual license
    const isValid = expiresAt === null ? true : new Date(expiresAt) >= new Date();

    return new Response(
      JSON.stringify({ valid: isValid, expires_at: expiresAt || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('License verification error:', error);
    return new Response(
      JSON.stringify({ valid: false, expires_at: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
