-- Run this in Supabase SQL Editor after applying contracts hardfix.
-- It confirms whether contracts RLS/grants are correct for current user context.

SELECT
  auth.uid() AS auth_uid,
  public.get_user_account_id(auth.uid()) AS derived_account_id;

SELECT
  p.id AS profile_user_id,
  p.account_id AS profile_account_id
FROM public.profiles p
WHERE p.id = auth.uid();

SELECT
  a.id AS account_id,
  a.owner_id,
  public.is_account_member(a.id) AS is_member
FROM public.accounts a
WHERE a.id = public.get_user_account_id(auth.uid());

SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'contracts'
ORDER BY policyname;

SELECT has_table_privilege('authenticated', 'public.contracts', 'INSERT') AS authenticated_can_insert;
