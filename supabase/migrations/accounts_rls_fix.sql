-- Fix 403 on POST /rest/v1/accounts
-- Cause: missing privileges/RLS policies for authenticated users.

ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts'
      AND policyname = 'Owners can insert their own account'
  ) THEN
    CREATE POLICY "Owners can insert their own account"
    ON public.accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts'
      AND policyname = 'Owners can view their own account'
  ) THEN
    CREATE POLICY "Owners can view their own account"
    ON public.accounts
    FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts'
      AND policyname = 'Owners can update their own account'
  ) THEN
    CREATE POLICY "Owners can update their own account"
    ON public.accounts
    FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());
  END IF;
END$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.accounts TO authenticated;
