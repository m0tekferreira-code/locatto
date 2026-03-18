import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  try {
    // Apenas métodos POST são permitidos
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Pegar o authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase com permissões de admin (service_role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar se o usuário é admin/superadmin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário é admin ou superadmin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔧 Admin ${user.email} iniciando aplicação do fix de RLS...`)

    // Executar o SQL fix
    const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        BEGIN;

        -- 1. Criar policy de INSERT em profiles
        DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
        CREATE POLICY "Users can insert their own profile"
        ON public.profiles
        FOR INSERT
        WITH CHECK (auth.uid() = id);

        -- 2. Melhorar função get_user_account_id com fallback robusto
        CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
        RETURNS uuid
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public
        AS $$
          SELECT COALESCE(
            (
              SELECT p.account_id
              FROM public.profiles p
              WHERE p.id = _user_id
                AND p.account_id IS NOT NULL
              LIMIT 1
            ),
            (
              SELECT a.id
              FROM public.accounts a
              WHERE a.owner_id = _user_id
              LIMIT 1
            )
          )
        $$;

        -- 3. Backfill: vincular profiles órfãos às contas que eles possuem
        UPDATE public.profiles p
        SET account_id = a.id
        FROM public.accounts a
        WHERE p.id = a.owner_id
          AND p.account_id IS NULL;

        COMMIT;
      `
    })

    // Se a função exec_sql não existir, tentar executar diretamente
    if (sqlError) {
      console.log('⚠️ exec_sql não disponível, executando queries separadamente...')
      
      // 1. DROP e CREATE policy
      await supabaseAdmin.rpc('exec', {
        query: 'DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles'
      })
      
      await supabaseAdmin.rpc('exec', {
        query: `CREATE POLICY "Users can insert their own profile"
                ON public.profiles
                FOR INSERT
                WITH CHECK (auth.uid() = id)`
      })

      // 2. Recriar função get_user_account_id
      await supabaseAdmin.rpc('exec', {
        query: `CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
                RETURNS uuid
                LANGUAGE sql
                STABLE
                SECURITY DEFINER
                SET search_path = public
                AS $$
                  SELECT COALESCE(
                    (
                      SELECT p.account_id
                      FROM public.profiles p
                      WHERE p.id = _user_id
                        AND p.account_id IS NOT NULL
                      LIMIT 1
                    ),
                    (
                      SELECT a.id
                      FROM public.accounts a
                      WHERE a.owner_id = _user_id
                      LIMIT 1
                    )
                  )
                $$`
      })

      // 3. Backfill profiles
      const { data: orphanProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .is('account_id', null)

      if (orphanProfiles && orphanProfiles.length > 0) {
        for (const profile of orphanProfiles) {
          const { data: account } = await supabaseAdmin
            .from('accounts')
            .select('id')
            .eq('owner_id', profile.id)
            .single()

          if (account) {
            await supabaseAdmin
              .from('profiles')
              .update({ account_id: account.id })
              .eq('id', profile.id)
          }
        }
      }
    }

    console.log('✅ Fix de RLS aplicado com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS fix aplicado com sucesso! Recarregue a página.',
        details: {
          policy_created: true,
          function_updated: true,
          profiles_updated: true
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('❌ Erro ao aplicar fix:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao aplicar fix';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        hint: 'Execute o SQL manualmente no Supabase Dashboard'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
