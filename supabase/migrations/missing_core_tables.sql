-- Core tables and functions required by the app in a fresh project.
-- Run this in Supabase SQL Editor (new project).

-- 1) Enum used by user_roles
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin',
    'socio',
    'assistente',
    'sdr',
    'suporte',
    'full',
    'agenda',
    'cadastro_leads',
    'financeiro',
    'super_admin',
    'trial'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- 2) profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  full_name text,
  avatar_url text,
  google_calendar_embed_url text,
  is_active boolean DEFAULT true,
  data_expiracao timestamptz,
  last_access timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);

-- 3) user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_account_id ON public.user_roles(account_id);

-- 4) invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  invoice_number text,
  reference_month date NOT NULL,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  rental_amount numeric(12,2) NOT NULL DEFAULT 0,
  condo_fee numeric(12,2),
  water_amount numeric(12,2),
  electricity_amount numeric(12,2),
  gas_amount numeric(12,2),
  internet_amount numeric(12,2),
  guarantee_installment numeric(12,2),
  guarantee_installment_number integer,
  extra_charges jsonb,
  bank_data jsonb,
  total_amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_date date,
  payment_method text,
  notes text,
  history jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT invoices_status_check CHECK (status IN ('pending', 'overdue', 'paid', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON public.invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON public.invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON public.invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- 5) Helper RPCs used by frontend/functions
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT p.account_id
  FROM public.profiles p
  WHERE p.id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'super_admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;
