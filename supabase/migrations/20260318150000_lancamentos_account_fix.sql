-- Compat fix for lancamentos_financeiros in partially migrated Supabase projects.
-- Safe to run multiple times.

-- Ensure account_id exists and references accounts.
ALTER TABLE public.lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS account_id uuid;

ALTER TABLE public.lancamentos_financeiros
  DROP CONSTRAINT IF EXISTS lancamentos_financeiros_account_id_fkey;

ALTER TABLE public.lancamentos_financeiros
  ADD CONSTRAINT lancamentos_financeiros_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

-- Backfill account_id for existing rows.
UPDATE public.lancamentos_financeiros lf
SET account_id = p.account_id
FROM public.profiles p
WHERE lf.account_id IS NULL
  AND p.id = lf.user_id;

CREATE INDEX IF NOT EXISTS idx_lancamentos_financeiros_account_id
ON public.lancamentos_financeiros(account_id);

-- Default account_id/user_id for authenticated inserts.
ALTER TABLE public.lancamentos_financeiros
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.lancamentos_financeiros
  ALTER COLUMN account_id SET DEFAULT public.get_user_account_id(auth.uid());

-- RLS and grants.
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lancamentos_financeiros TO authenticated;

-- Remove all legacy/conflicting policies.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lancamentos_financeiros'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lancamentos_financeiros', p.policyname);
  END LOOP;
END $$;

-- Deterministic account-based policies.
CREATE POLICY lancamentos_select_policy
ON public.lancamentos_financeiros
FOR SELECT
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY lancamentos_insert_policy
ON public.lancamentos_financeiros
FOR INSERT
TO authenticated
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND COALESCE(user_id, auth.uid()) = auth.uid()
);

CREATE POLICY lancamentos_update_policy
ON public.lancamentos_financeiros
FOR UPDATE
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()))
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND COALESCE(user_id, auth.uid()) = auth.uid()
);

CREATE POLICY lancamentos_delete_policy
ON public.lancamentos_financeiros
FOR DELETE
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()));
