-- Pre-requisitos para rodar tables_only.sql em banco novo
-- Cria tipos e tabelas-base que as migrations assumem como existentes.

DO $$
BEGIN
  CREATE TYPE public.lancamento_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  CREATE TYPE public.lancamento_tipo AS ENUM ('receita', 'despesa');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_name text NOT NULL,
  subscription_status text NOT NULL DEFAULT 'trial',
  data_expiracao timestamptz,
  plan_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(owner_id)
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_type text NOT NULL,
  email text,
  phone text,
  document text,
  company text,
  address text,
  notes text,
  status text,
  lead_score integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  property_type text NOT NULL,
  status text NOT NULL DEFAULT 'disponivel',
  address text NOT NULL,
  number text,
  complement text,
  neighborhood text,
  city text NOT NULL,
  state text NOT NULL,
  country text,
  postal_code text,
  owner_name text,
  owner_email text,
  owner_contact text,
  total_area numeric,
  useful_area numeric,
  built_area numeric,
  land_area numeric,
  construction_year integer,
  classification text,
  registry_data text,
  nearby_facilities jsonb,
  linked_persons jsonb,
  photos text[],
  cover_photo text,
  documents jsonb,
  publish_to_portals boolean DEFAULT false,
  portal_listing_id text,
  portal_last_sync timestamptz,
  portal_status text DEFAULT 'draft',
  transaction_type text DEFAULT 'rent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  contract_number text,
  tenant_name text NOT NULL,
  tenant_document text,
  tenant_email text,
  tenant_phone text,
  tenant_rg text,
  tenant_profession text,
  tenant_emergency_phone text,
  co_tenants jsonb,
  rental_value numeric(12,2) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  payment_day integer,
  payment_method text,
  guarantee_type text,
  guarantee_value numeric(12,2),
  adjustment_index text,
  extra_charges jsonb,
  documents jsonb,
  pre_paid boolean DEFAULT false,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
