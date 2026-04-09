-- Create webhook_configs table for storing invoice webhook configurations per account
CREATE TABLE IF NOT EXISTS webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Webhook Principal',
  webhook_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,

  -- Payload field toggles
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

  -- PDF / link options
  -- 'none' | 'pdf_attachment' | 'public_link'
  invoice_delivery_mode text NOT NULL DEFAULT 'public_link',

  -- Custom message template (supports {{placeholders}})
  custom_message text DEFAULT '',

  -- HTTP config
  http_method text NOT NULL DEFAULT 'POST',
  custom_headers jsonb DEFAULT '{}',
  auth_type text NOT NULL DEFAULT 'none',
  auth_token text DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
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
