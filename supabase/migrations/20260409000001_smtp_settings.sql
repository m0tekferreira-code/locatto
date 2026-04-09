-- Create smtp_settings table for storing email configuration per account
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

-- Enable RLS
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own account's SMTP settings
CREATE POLICY "Users can view own account smtp_settings"
  ON smtp_settings FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM accounts WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own account smtp_settings"
  ON smtp_settings FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM accounts WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own account smtp_settings"
  ON smtp_settings FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM accounts WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own account smtp_settings"
  ON smtp_settings FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM accounts WHERE owner_id = auth.uid()
    )
  );
