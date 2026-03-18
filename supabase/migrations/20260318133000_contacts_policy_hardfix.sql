-- Hard fix for persistent 403 on POST /rest/v1/contacts
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

-- 2) Ensure contacts/account relation and defaults
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS account_id uuid;

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_account_id_fkey;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

ALTER TABLE public.contacts
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.contacts
  ALTER COLUMN account_id SET DEFAULT public.get_user_account_id(auth.uid());

UPDATE public.contacts c
SET account_id = public.get_user_account_id(c.user_id)
WHERE c.account_id IS NULL
  AND c.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts(account_id);

-- 3) Grants
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contacts TO authenticated;

-- 4) Drop all existing policies on contacts to avoid conflicts
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contacts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contacts', p.policyname);
  END LOOP;
END $$;

-- 5) Recreate deterministic policies
CREATE POLICY contacts_select_policy
ON public.contacts
FOR SELECT
TO authenticated
USING (public.is_account_member(account_id));

CREATE POLICY contacts_insert_policy
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_account_member(account_id)
  AND COALESCE(user_id, auth.uid()) = auth.uid()
);

CREATE POLICY contacts_update_policy
ON public.contacts
FOR UPDATE
TO authenticated
USING (public.is_account_member(account_id))
WITH CHECK (
  public.is_account_member(account_id)
  AND COALESCE(user_id, auth.uid()) = auth.uid()
);

CREATE POLICY contacts_delete_policy
ON public.contacts
FOR DELETE
TO authenticated
USING (public.is_account_member(account_id));
