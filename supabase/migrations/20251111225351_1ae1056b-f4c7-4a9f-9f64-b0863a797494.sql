-- PARTE 2: Criar tabela accounts, funções e políticas

-- 1. Criar tabela accounts (hierarquia de contas)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_name text NOT NULL,
  subscription_status text NOT NULL DEFAULT 'trial',
  data_expiracao timestamp with time zone,
  plan_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(owner_id)
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 2. Adicionar account_id às tabelas existentes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.scheduled_visits ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_properties_account_id ON public.properties(account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_account_id ON public.contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON public.invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_account_id ON public.lancamentos_financeiros(account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON public.accounts(owner_id);

-- 4. Função para verificar se usuário é super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- 5. Função para obter account_id de um usuário
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

-- 6. RLS Policies para accounts
CREATE POLICY "Super admins can view all accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Owners can view their own account"
ON public.accounts
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Account members can view their account"
ON public.accounts
FOR SELECT
TO authenticated
USING (id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Super admins can update all accounts"
ON public.accounts
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Owners can update their own account"
ON public.accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "System can create accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. Atualizar trigger de updated_at para accounts
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Atualizar função handle_new_user para criar account automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
DECLARE
  is_first_user BOOLEAN;
  new_account_id uuid;
BEGIN
  -- Verificar se é o primeiro usuário
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) INTO is_first_user;
  
  -- Criar conta trial para o novo usuário
  INSERT INTO public.accounts (owner_id, account_name, subscription_status, data_expiracao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'trial',
    now() + interval '14 days'
  )
  RETURNING id INTO new_account_id;
  
  -- Criar perfil vinculado à conta
  INSERT INTO public.profiles (id, full_name, account_id, data_expiracao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    new_account_id,
    now() + interval '14 days'
  );
  
  -- Se for o primeiro usuário, torná-lo super_admin
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  ELSE
    -- Usuários novos começam com role 'trial'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'trial');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 9. Migrar dados existentes (criar accounts para usuários que já existem)
DO $$
DECLARE
  user_record RECORD;
  new_account_id uuid;
BEGIN
  FOR user_record IN 
    SELECT p.id, p.full_name, p.data_expiracao
    FROM public.profiles p
    WHERE p.account_id IS NULL
  LOOP
    -- Criar account para cada usuário existente
    INSERT INTO public.accounts (owner_id, account_name, subscription_status, data_expiracao)
    VALUES (
      user_record.id,
      COALESCE(user_record.full_name, 'Conta Principal'),
      CASE 
        WHEN user_record.data_expiracao IS NULL THEN 'active'
        WHEN user_record.data_expiracao > now() THEN 'active'
        ELSE 'expired'
      END,
      user_record.data_expiracao
    )
    RETURNING id INTO new_account_id;
    
    -- Atualizar profile com account_id
    UPDATE public.profiles
    SET account_id = new_account_id
    WHERE id = user_record.id;
    
    -- Atualizar properties com account_id
    UPDATE public.properties
    SET account_id = new_account_id
    WHERE user_id = user_record.id;
    
    -- Atualizar contracts com account_id
    UPDATE public.contracts
    SET account_id = new_account_id
    WHERE user_id = user_record.id;
    
    -- Atualizar invoices com account_id
    UPDATE public.invoices
    SET account_id = new_account_id
    WHERE user_id = user_record.id;
    
    -- Atualizar lancamentos_financeiros com account_id
    UPDATE public.lancamentos_financeiros
    SET account_id = new_account_id
    WHERE user_id = user_record.id;
    
    -- Atualizar contacts com account_id
    UPDATE public.contacts
    SET account_id = new_account_id
    WHERE user_id = user_record.id;
    
    -- Atualizar scheduled_visits com account_id
    UPDATE public.scheduled_visits
    SET account_id = new_account_id
    WHERE user_id = user_record.id;
  END LOOP;
END $$;