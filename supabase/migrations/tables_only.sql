CREATE TABLE public.scheduled_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  visitor_email TEXT,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by TEXT DEFAULT 'agent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


create table if not exists public.billing_plans (
  id text primary key,
  name text not null,
  price_cents integer not null,
  days_duration integer not null default 30,
  provider text not null default 'cakto',
  provider_link text not null,
  created_at timestamptz not null default now()
);


create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.billing_plans(id),
  status text not null default 'created' check (status in ('created','redirected','paid','expired','failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours')
);


create table if not exists public.payments (
  id bigserial primary key,
  provider text not null default 'cakto',
  event_id text unique,
  external_tx_id text,
  session_id uuid references public.checkout_sessions(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references public.billing_plans(id),
  amount_cents integer,
  currency text default 'BRL',
  status text not null check (status in ('paid','refunded','failed','pending')),
  raw jsonb not null,
  created_at timestamptz not null default now()
);


create table if not exists public.license_audit (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_expiration timestamptz,
  new_expiration timestamptz,
  source text not null,
  ref_payment_id bigint references public.payments(id),
  created_at timestamptz not null default now()
);


CREATE TABLE public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  id_imovel UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  id_contrato UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  tipo lancamento_tipo NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status lancamento_status NOT NULL DEFAULT 'pendente',
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  descricao TEXT,
  categoria TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


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


CREATE TABLE IF NOT EXISTS public.portal_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) NOT NULL,
  provider TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ad_limit INTEGER DEFAULT 0,
  featured_limit INTEGER DEFAULT 0,
  credentials JSONB DEFAULT '{}'::jsonb,
  feed_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.portal_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id),
  property_id UUID REFERENCES public.properties(id),
  portal TEXT,
  action TEXT,
  status TEXT,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE public.extrato_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  nome_extrato text NOT NULL,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id, nome_extrato)
);


