-- Fix permissões/RLS de contacts para novo projeto Supabase
-- Execute no SQL Editor do projeto alvo, se ainda não rodou as migrations completas.

-- 1) Garante função auxiliar de conta do usuário
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

-- 2) Corrige FK de contacts.account_id (alguns ambientes ficaram com referência incorreta)
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_account_id_fkey;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

-- 3) Defaults para inserts via client autenticado
ALTER TABLE public.contacts
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.contacts
  ALTER COLUMN account_id SET DEFAULT public.get_user_account_id(auth.uid());

-- 4) Backfill de dados antigos sem account_id
UPDATE public.contacts c
SET account_id = public.get_user_account_id(c.user_id)
WHERE c.account_id IS NULL
  AND c.user_id IS NOT NULL;

-- 5) RLS + grants
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contacts TO authenticated;

DROP POLICY IF EXISTS "Account members can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Account members can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Account members can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Account members can delete contacts" ON public.contacts;

CREATE POLICY "Account members can view contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert contacts"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Account members can update contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()))
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Account members can delete contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (account_id = public.get_user_account_id(auth.uid()));
