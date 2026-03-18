-- Hard fix for persistent 403 on POST /rest/v1/contracts
-- Safe to run multiple times.

-- 1) Helpers
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

GRANT EXECUTE ON FUNCTION public.get_user_account_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_member(uuid) TO authenticated;

-- 2) Ensure defaults and index
ALTER TABLE public.contracts
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.contracts
  ALTER COLUMN account_id SET DEFAULT public.get_user_account_id(auth.uid());

UPDATE public.contracts c
SET account_id = public.get_user_account_id(c.user_id)
WHERE c.account_id IS NULL
  AND c.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_account_id ON public.contracts(account_id);

-- 3) RLS + grants
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contracts TO authenticated;

-- 4) Drop all existing policies to avoid conflicts
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contracts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contracts', p.policyname);
  END LOOP;
END $$;

-- 5) Deterministic policies
CREATE POLICY contracts_select_policy
ON public.contracts
FOR SELECT
TO authenticated
USING (public.is_account_member(account_id));

CREATE POLICY contracts_insert_policy
ON public.contracts
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_account_member(account_id)
  AND COALESCE(user_id, auth.uid()) = auth.uid()
);

CREATE POLICY contracts_update_policy
ON public.contracts
FOR UPDATE
TO authenticated
USING (public.is_account_member(account_id))
WITH CHECK (
  public.is_account_member(account_id)
  AND COALESCE(user_id, auth.uid()) = auth.uid()
);

CREATE POLICY contracts_delete_policy
ON public.contracts
FOR DELETE
TO authenticated
USING (public.is_account_member(account_id));
