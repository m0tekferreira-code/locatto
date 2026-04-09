import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function para aplicar migrations pendentes automaticamente.
 * Usa service_role para executar DDL.
 * Cada migration é idempotente (IF NOT EXISTS) e registrada na tabela _applied_migrations.
 */

const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '20260409_smtp_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS smtp_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        smtp_host text NOT NULL,
        smtp_port integer NOT NULL DEFAULT 587,
        smtp_user text NOT NULL,
        smtp_pass text NOT NULL,
        from_email text NOT NULL,
        from_name text NOT NULL DEFAULT '',
        use_tls boolean NOT NULL DEFAULT true,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(account_id)
      );

      ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'smtp_settings' AND policyname = 'Users can view own account smtp_settings'
        ) THEN
          CREATE POLICY "Users can view own account smtp_settings"
            ON smtp_settings FOR SELECT
            USING (
              account_id IN (
                SELECT account_id FROM profiles WHERE id = auth.uid()
                UNION
                SELECT id FROM accounts WHERE owner_id = auth.uid()
              )
            );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'smtp_settings' AND policyname = 'Users can insert own account smtp_settings'
        ) THEN
          CREATE POLICY "Users can insert own account smtp_settings"
            ON smtp_settings FOR INSERT
            WITH CHECK (
              account_id IN (
                SELECT account_id FROM profiles WHERE id = auth.uid()
                UNION
                SELECT id FROM accounts WHERE owner_id = auth.uid()
              )
            );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'smtp_settings' AND policyname = 'Users can update own account smtp_settings'
        ) THEN
          CREATE POLICY "Users can update own account smtp_settings"
            ON smtp_settings FOR UPDATE
            USING (
              account_id IN (
                SELECT account_id FROM profiles WHERE id = auth.uid()
                UNION
                SELECT id FROM accounts WHERE owner_id = auth.uid()
              )
            );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'smtp_settings' AND policyname = 'Users can delete own account smtp_settings'
        ) THEN
          CREATE POLICY "Users can delete own account smtp_settings"
            ON smtp_settings FOR DELETE
            USING (
              account_id IN (
                SELECT account_id FROM profiles WHERE id = auth.uid()
                UNION
                SELECT id FROM accounts WHERE owner_id = auth.uid()
              )
            );
        END IF;
      END $$;
    `,
  },
  {
    id: '20260409_webhook_configs',
    sql: `
      CREATE TABLE IF NOT EXISTS webhook_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        name text NOT NULL DEFAULT 'Webhook Principal',
        webhook_url text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        include_tenant_name boolean NOT NULL DEFAULT true,
        include_tenant_document boolean NOT NULL DEFAULT false,
        include_tenant_email boolean NOT NULL DEFAULT true,
        include_tenant_phone boolean NOT NULL DEFAULT true,
        include_property_address boolean NOT NULL DEFAULT true,
        include_contract_number boolean NOT NULL DEFAULT true,
        include_contract_dates boolean NOT NULL DEFAULT false,
        include_contract_value boolean NOT NULL DEFAULT false,
        include_invoice_number boolean NOT NULL DEFAULT true,
        include_invoice_amount boolean NOT NULL DEFAULT true,
        include_invoice_due_date boolean NOT NULL DEFAULT true,
        include_invoice_status boolean NOT NULL DEFAULT true,
        include_invoice_breakdown boolean NOT NULL DEFAULT false,
        include_reference_month boolean NOT NULL DEFAULT true,
        invoice_delivery_mode text NOT NULL DEFAULT 'public_link',
        custom_message text DEFAULT '',
        http_method text NOT NULL DEFAULT 'POST',
        custom_headers jsonb DEFAULT '{}',
        auth_type text NOT NULL DEFAULT 'none',
        auth_token text DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'webhook_configs' AND policyname = 'Users can view own account webhook_configs'
        ) THEN
          CREATE POLICY "Users can view own account webhook_configs"
            ON webhook_configs FOR SELECT
            USING (
              account_id IN (
                SELECT account_id FROM profiles WHERE id = auth.uid()
                UNION
                SELECT id FROM accounts WHERE owner_id = auth.uid()
              )
            );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'webhook_configs' AND policyname = 'Users can insert own account webhook_configs'
        ) THEN
          CREATE POLICY "Users can insert own account webhook_configs"
            ON webhook_configs FOR INSERT
            WITH CHECK (
              account_id IN (
                SELECT account_id FROM profiles WHERE id = auth.uid()
                UNION
                SELECT id FROM accounts WHERE owner_id = auth.uid()
              )
            );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'webhook_configs' AND policyname = 'Users can update own account webhook_configs'
        ) THEN
          CREATE POLICY "Users can update own account webhook_configs"
            ON webhook_configs FOR UPDATE
            USING (
              account_id IN (
                SELECT account_id FROM profiles WHERE id = auth.uid()
                UNION
                SELECT id FROM accounts WHERE owner_id = auth.uid()
              )
            );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'webhook_configs' AND policyname = 'Users can delete own account webhook_configs'
        ) THEN
          CREATE POLICY "Users can delete own account webhook_configs"
            ON webhook_configs FOR DELETE
            USING (
              account_id IN (
                SELECT account_id FROM profiles WHERE id = auth.uid()
                UNION
                SELECT id FROM accounts WHERE owner_id = auth.uid()
              )
            );
        END IF;
      END $$;
    `,
  },
]

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o usuário está autenticado
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente admin com service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Criar tabela de controle de migrations (se não existir)
    await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS _applied_migrations (
          id text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        );
      `
    }).catch(() => {
      // Se exec_sql não existir, a tabela pode não ser criável via RPC
      // Mas a migration em si usará IF NOT EXISTS então é seguro continuar
    })

    // Verificar quais migrations já foram aplicadas
    const { data: applied } = await supabaseAdmin
      .from('_applied_migrations')
      .select('id')
      .catch(() => ({ data: null })) as { data: { id: string }[] | null }

    const appliedIds = new Set((applied || []).map((r) => r.id))

    const results: { id: string; status: string }[] = []

    for (const migration of MIGRATIONS) {
      if (appliedIds.has(migration.id)) {
        results.push({ id: migration.id, status: 'already_applied' })
        continue
      }

      try {
        // Tenta via exec_sql (se existir function)
        const { error: execError } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: migration.sql,
        })

        if (execError) {
          console.error(`Migration ${migration.id} via exec_sql failed:`, execError.message)
          // Failsafe: many Supabase projects don't have exec_sql
          // The DDL is idempotent, so we just log and continue
          results.push({ id: migration.id, status: 'exec_sql_unavailable' })
          continue
        }

        // Registrar migration como aplicada
        await supabaseAdmin
          .from('_applied_migrations')
          .upsert({ id: migration.id })
          .catch(() => {})

        results.push({ id: migration.id, status: 'applied' })
        console.log(`✅ Migration ${migration.id} applied successfully`)
      } catch (err) {
        console.error(`Migration ${migration.id} error:`, err)
        results.push({ id: migration.id, status: 'error' })
      }
    }

    return new Response(
      JSON.stringify({ success: true, migrations: results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Auto-migration error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
