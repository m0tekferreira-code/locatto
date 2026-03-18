-- ⚠️ AÇÃO URGENTE: Rode este SQL no Supabase Dashboard → SQL Editor
-- Este script corrige o bloqueio RLS que está causando os erros 403/401
-- 
-- ========================================
-- OPÇÃO 1: Via GitHub Actions (RECOMENDADO)
-- ========================================
-- 1. Configure os secrets no GitHub (veja SETUP_GITHUB_ACTIONS.md)
-- 2. Acesse: https://github.com/[SEU_USER]/acordus/actions
-- 3. Execute o workflow "Apply Emergency RLS Fix"
-- 4. Recarregue o app: https://locatto.vercel.app/
--
-- ========================================
-- OPÇÃO 2: Manual no Dashboard
-- ========================================
-- 1. Acesse: https://supabase.com/dashboard/project/esinwvukarglzeoxioni/sql/new
-- 2. Cole TODO este conteúdo
-- 3. Clique em "RUN" 
-- 4. Após aplicado, RECARREGUE a página do app (Ctrl+F5)

BEGIN;

-- 1. Criar policy de INSERT em profiles (corrige 403 no upsert de profiles)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 2. Melhorar função get_user_account_id com fallback robusto
-- (corrige 403 no insert de properties quando profile.account_id está null)
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.account_id
      FROM public.profiles p
      WHERE p.id = _user_id
        AND p.account_id IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT a.id
      FROM public.accounts a
      WHERE a.owner_id = _user_id
      LIMIT 1
    )
  )
$$;

-- 3. Backfill: vincular profiles órfãos às contas que eles possuem
-- (sincroniza dados existentes)
UPDATE public.profiles p
SET account_id = a.id
FROM public.accounts a
WHERE p.id = a.owner_id
  AND p.account_id IS NULL;

COMMIT;

-- ✅ Após rodar este script:
-- - Os erros 403 de profiles devem parar
-- - Os erros 403 de properties devem parar  
-- - O loader deve chegar em 100%
-- - Você poderá cadastrar imóveis normalmente
