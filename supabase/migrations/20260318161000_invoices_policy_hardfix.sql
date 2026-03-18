-- Hard fix for persistent 403 on POST /rest/v1/invoices
-- Safe to run multiple times.

-- 1) Helper function
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_user_account_id(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_account_member(_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_id = _account_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = _account_id
      AND a.owner_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_account_member(uuid) TO authenticated;

-- 2) Ensure account_id exists and is populated
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS account_id uuid;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_account_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

UPDATE public.invoices i
SET account_id = p.account_id
FROM public.profiles p
WHERE i.account_id IS NULL
  AND p.id = i.user_id;

CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON public.invoices(account_id);

-- 3) Defaults for authenticated inserts
ALTER TABLE public.invoices
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.invoices
  ALTER COLUMN account_id SET DEFAULT public.get_user_account_id(auth.uid());

-- 4) RLS and grants
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoices TO authenticated;

-- 5) Remove legacy/conflicting policies
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', p.policyname);
  END LOOP;
END $$;

-- 6) Deterministic account policies
CREATE POLICY invoices_select_policy
ON public.invoices
FOR SELECT
TO authenticated
USING (public.is_account_member(account_id));

CREATE POLICY invoices_insert_policy
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_account_member(account_id)
  AND COALESCE(user_id, auth.uid()) = auth.uid()
);

CREATE POLICY invoices_update_policy
ON public.invoices
FOR UPDATE
TO authenticated
USING (public.is_account_member(account_id))
WITH CHECK (
  public.is_account_member(account_id)
  AND COALESCE(user_id, auth.uid()) = auth.uid()
);

CREATE POLICY invoices_delete_policy
ON public.invoices
FOR DELETE
TO authenticated
USING (public.is_account_member(account_id));
