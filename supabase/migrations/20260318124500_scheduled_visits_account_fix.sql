-- Compat fix for scheduled_visits in migrated/new Supabase projects.

-- Ensure account_id exists and references accounts.
ALTER TABLE public.scheduled_visits
  ADD COLUMN IF NOT EXISTS account_id uuid;

ALTER TABLE public.scheduled_visits
  DROP CONSTRAINT IF EXISTS scheduled_visits_account_id_fkey;

ALTER TABLE public.scheduled_visits
  ADD CONSTRAINT scheduled_visits_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

-- Fill account_id for existing rows.
UPDATE public.scheduled_visits sv
SET account_id = p.account_id
FROM public.profiles p
WHERE sv.account_id IS NULL
  AND p.id = sv.user_id;

-- Index for account-based queries.
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_account_id
ON public.scheduled_visits(account_id);

-- Keep account_id in sync on new rows.
ALTER TABLE public.scheduled_visits
  ALTER COLUMN account_id SET DEFAULT public.get_user_account_id(auth.uid());

-- Ensure RLS and grants.
ALTER TABLE public.scheduled_visits ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scheduled_visits TO authenticated;

DROP POLICY IF EXISTS "Account members can view scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Account members can create scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Account members can update scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Account members can delete scheduled visits" ON public.scheduled_visits;

CREATE POLICY "Account members can view scheduled visits"
ON public.scheduled_visits
FOR SELECT
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Account members can create scheduled visits"
ON public.scheduled_visits
FOR INSERT
TO authenticated
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Account members can update scheduled visits"
ON public.scheduled_visits
FOR UPDATE
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()))
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Account members can delete scheduled visits"
ON public.scheduled_visits
FOR DELETE
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()));
