-- ==============================\n-- FILE: 20251021161807_b9574225-b809-4f69-a2e0-1ae8b0798dd0.sql\n-- ==============================\n
-- Fix security issues: Remove public access policies and add proper user-scoped policies

-- 1. Fix agent_configs table
DROP POLICY IF EXISTS "Permitir acesso público a agent_configs" ON public.agent_configs;

CREATE POLICY "Users can manage their own agent configs"
ON public.agent_configs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Fix leads table - First add user_id column if it doesn't exist
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);

-- Drop public policy and add user-scoped policy
DROP POLICY IF EXISTS "Permitir acesso público a leads" ON public.leads;

CREATE POLICY "Users can manage their own leads"
ON public.leads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Fix messages table
DROP POLICY IF EXISTS "Permitir acesso público a messages" ON public.messages;

-- Messages should be accessible through conversations that belong to user's leads
CREATE POLICY "Users can view messages from their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = messages.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = messages.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = messages.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages in their conversations"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = messages.conversation_id
    AND l.user_id = auth.uid()
  )
);

-- 4. Fix conversations table
DROP POLICY IF EXISTS "Permitir acesso público a conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = conversations.lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = conversations.lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own conversations"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = conversations.lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own conversations"
ON public.conversations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = conversations.lead_id
    AND leads.user_id = auth.uid()
  )
);

-- 5. Fix conversation_summaries table
DROP POLICY IF EXISTS "Permitir acesso público a summaries" ON public.conversation_summaries;

CREATE POLICY "Users can view summaries of their conversations"
ON public.conversation_summaries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = conversation_summaries.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert summaries for their conversations"
ON public.conversation_summaries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = conversation_summaries.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update summaries of their conversations"
ON public.conversation_summaries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = conversation_summaries.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete summaries of their conversations"
ON public.conversation_summaries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = conversation_summaries.conversation_id
    AND l.user_id = auth.uid()
  )
);
\n
-- ==============================\n-- FILE: 20251023115627_c81043de-c85e-4de3-a8a4-c33f4fc40c86.sql\n-- ==============================\n
-- Add missing tenant fields to contracts table
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS tenant_rg text,
ADD COLUMN IF NOT EXISTS tenant_profession text,
ADD COLUMN IF NOT EXISTS tenant_emergency_phone text,
ADD COLUMN IF NOT EXISTS co_tenants jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contracts.tenant_rg IS 'RG/Identity document of the tenant';
COMMENT ON COLUMN public.contracts.tenant_profession IS 'Profession/occupation of the tenant';
COMMENT ON COLUMN public.contracts.tenant_emergency_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN public.contracts.co_tenants IS 'Array of co-tenants/residents: [{"name": "...", "document": "...", "relationship": "..."}]';
\n
-- ==============================\n-- FILE: 20251024114841_054a27b6-239e-4bf2-8cbf-79a2bfad0ee5.sql\n-- ==============================\n
-- Create table for scheduled visits
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

-- Enable Row Level Security
ALTER TABLE public.scheduled_visits ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own scheduled visits" 
ON public.scheduled_visits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled visits" 
ON public.scheduled_visits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled visits" 
ON public.scheduled_visits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled visits" 
ON public.scheduled_visits 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scheduled_visits_updated_at
BEFORE UPDATE ON public.scheduled_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_scheduled_visits_user_id ON public.scheduled_visits(user_id);
CREATE INDEX idx_scheduled_visits_visit_date ON public.scheduled_visits(visit_date);
CREATE INDEX idx_scheduled_visits_status ON public.scheduled_visits(status);
\n
-- ==============================\n-- FILE: 20251024115722_e273956e-6d31-4378-94a2-236b8f2964d3.sql\n-- ==============================\n
-- Update app_role enum to include new role types
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'full';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agenda';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cadastro_leads';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';

-- Add status column to profiles table for user activation/deactivation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_access TIMESTAMP WITH TIME ZONE;

-- Create policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create policy to allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Update existing policies for user_roles to allow admins to manage roles
-- (policies already exist, just documenting the expected behavior)

-- Create index for better performance on profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_last_access ON public.profiles(last_access);
\n
-- ==============================\n-- FILE: 20251027113339_4792978b-0dc0-4174-adf5-010e37d44e7c.sql\n-- ==============================\n
-- Add extra_charges column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS extra_charges JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance with JSONB queries
CREATE INDEX IF NOT EXISTS idx_contracts_extra_charges 
ON public.contracts USING gin(extra_charges);

COMMENT ON COLUMN public.contracts.extra_charges IS 'Array of additional charges (guarantee, iptu, condo fees, utilities, etc.) to be applied to invoices';
\n
-- ==============================\n-- FILE: 20251028143949_ef3ef552-add5-4b3c-98e1-ab23979b2fd6.sql\n-- ==============================\n
-- Add expiration date column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS data_expiracao TIMESTAMPTZ;
\n
-- ==============================\n-- FILE: 20251101120046_c6784c1d-d1c7-41cc-b769-5583c7e9ab7d.sql\n-- ==============================\n
-- Tabela de planos disponíveis
create table if not exists public.billing_plans (
  id text primary key,
  name text not null,
  price_cents integer not null,
  days_duration integer not null default 30,
  provider text not null default 'cakto',
  provider_link text not null,
  created_at timestamptz not null default now()
);

-- Tabela de sessões de checkout (para correlacionar webhooks)
create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.billing_plans(id),
  status text not null default 'created' check (status in ('created','redirected','paid','expired','failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours')
);

create index if not exists idx_checkout_sessions_user on public.checkout_sessions(user_id);
create index if not exists idx_checkout_sessions_status on public.checkout_sessions(status);

-- Tabela de pagamentos (idempotência de webhook)
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

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_event_id on public.payments(event_id) where event_id is not null;
create index if not exists idx_payments_session on public.payments(session_id) where session_id is not null;

-- Tabela de auditoria de licença
create table if not exists public.license_audit (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_expiration timestamptz,
  new_expiration timestamptz,
  source text not null,
  ref_payment_id bigint references public.payments(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_license_audit_user on public.license_audit(user_id);

-- Enable RLS
alter table public.billing_plans enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.payments enable row level security;
alter table public.license_audit enable row level security;

-- RLS Policies: billing_plans (público para SELECT)
create policy "Anyone can view billing plans"
  on public.billing_plans
  for select
  using (true);

-- RLS Policies: checkout_sessions (usuário vê apenas suas sessões)
create policy "Users can view their own checkout sessions"
  on public.checkout_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own checkout sessions"
  on public.checkout_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own checkout sessions"
  on public.checkout_sessions
  for update
  using (auth.uid() = user_id);

-- RLS Policies: payments (admins veem tudo, usuários veem seus próprios)
create policy "Admins can view all payments"
  on public.payments
  for select
  using (has_role(auth.uid(), 'admin'));

create policy "Users can view their own payments"
  on public.payments
  for select
  using (auth.uid() = user_id);

create policy "Service role can insert payments"
  on public.payments
  for insert
  with check (true);

-- RLS Policies: license_audit (admins veem tudo, usuários veem seus próprios)
create policy "Admins can view all license audit"
  on public.license_audit
  for select
  using (has_role(auth.uid(), 'admin'));

create policy "Users can view their own license audit"
  on public.license_audit
  for select
  using (auth.uid() = user_id);

create policy "Service role can insert license audit"
  on public.license_audit
  for insert
  with check (true);

-- Seed: Plano COMEÇO
insert into public.billing_plans(id, name, price_cents, days_duration, provider_link)
values ('comeco','COMEÇO',14900,30,'https://pay.cakto.com.br/4ckoxng_630310')
on conflict (id) do update
set name=excluded.name, 
    price_cents=excluded.price_cents, 
    days_duration=excluded.days_duration,
    provider_link=excluded.provider_link;
\n
-- ==============================\n-- FILE: 20251103110207_f5e22076-eea2-4737-adf6-b7e3a2ddf67a.sql\n-- ==============================\n
-- Add linked_persons column to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS linked_persons JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN properties.linked_persons IS 
'Array de pessoas vinculadas ao imóvel (fiadores, procuradores, etc)';
\n
-- ==============================\n-- FILE: 20251108105821_b008a2e8-039f-4ac3-a4a2-45cee6917e9e.sql\n-- ==============================\n
-- Criar buckets para fotos e documentos dos imóveis
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('property-photos', 'property-photos', true),
  ('property-documents', 'property-documents', false);

-- Políticas para fotos dos imóveis (público para leitura)
CREATE POLICY "Fotos são visíveis publicamente"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

CREATE POLICY "Usuários autenticados podem fazer upload de fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem atualizar suas próprias fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem deletar suas próprias fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-photos' 
  AND auth.role() = 'authenticated'
);

-- Políticas para documentos dos imóveis (privado)
CREATE POLICY "Usuários podem ver seus próprios documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários autenticados podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem atualizar seus próprios documentos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem deletar seus próprios documentos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-documents' 
  AND auth.role() = 'authenticated'
);

-- Adicionar campos para armazenar URLs dos arquivos
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
\n
-- ==============================\n-- FILE: 20251108110607_38014f25-0762-4e19-b8bb-9c6652cee4bc.sql\n-- ==============================\n
-- Adicionar campo para foto de capa
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS cover_photo TEXT;
\n
-- ==============================\n-- FILE: 20251109135531_d9b77ef4-f94c-4278-8e3d-c324e5b7c51f.sql\n-- ==============================\n
-- Criar ENUM para tipo de lançamento
CREATE TYPE lancamento_tipo AS ENUM ('receita', 'despesa');

-- Criar ENUM para status de lançamento
CREATE TYPE lancamento_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');

-- Criar tabela de lançamentos financeiros
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

-- Criar índices para melhor performance
CREATE INDEX idx_lancamentos_user_id ON public.lancamentos_financeiros(user_id);
CREATE INDEX idx_lancamentos_imovel ON public.lancamentos_financeiros(id_imovel);
CREATE INDEX idx_lancamentos_contrato ON public.lancamentos_financeiros(id_contrato);
CREATE INDEX idx_lancamentos_data_vencimento ON public.lancamentos_financeiros(data_vencimento);
CREATE INDEX idx_lancamentos_data_pagamento ON public.lancamentos_financeiros(data_pagamento);
CREATE INDEX idx_lancamentos_status ON public.lancamentos_financeiros(status);
CREATE INDEX idx_lancamentos_tipo ON public.lancamentos_financeiros(tipo);

-- Habilitar RLS
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Users can view their own lancamentos"
  ON public.lancamentos_financeiros
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lancamentos"
  ON public.lancamentos_financeiros
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lancamentos"
  ON public.lancamentos_financeiros
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lancamentos"
  ON public.lancamentos_financeiros
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lancamentos_financeiros_updated_at
  BEFORE UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar status automaticamente
CREATE OR REPLACE FUNCTION public.update_lancamento_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se foi pago, muda para 'pago'
  IF NEW.data_pagamento IS NOT NULL AND NEW.status = 'pendente' THEN
    NEW.status := 'pago';
  END IF;
  
  -- Se não foi pago e está vencido, muda para 'atrasado'
  IF NEW.data_pagamento IS NULL 
     AND NEW.status = 'pendente' 
     AND NEW.data_vencimento < CURRENT_DATE THEN
    NEW.status := 'atrasado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_lancamento_status
  BEFORE INSERT OR UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lancamento_status();

-- Função para calcular resumo financeiro
CREATE OR REPLACE FUNCTION public.get_resumo_financeiro(
  p_user_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE(
  total_receitas DECIMAL,
  total_despesas DECIMAL,
  saldo DECIMAL,
  total_inadimplencia DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total de receitas pagas no período
    COALESCE(SUM(CASE 
      WHEN tipo = 'receita' 
        AND status = 'pago' 
        AND data_pagamento BETWEEN p_data_inicio AND p_data_fim 
      THEN valor 
      ELSE 0 
    END), 0) AS total_receitas,
    
    -- Total de despesas pagas no período
    COALESCE(SUM(CASE 
      WHEN tipo = 'despesa' 
        AND status = 'pago' 
        AND data_pagamento BETWEEN p_data_inicio AND p_data_fim 
      THEN valor 
      ELSE 0 
    END), 0) AS total_despesas,
    
    -- Saldo (receitas - despesas)
    COALESCE(SUM(CASE 
      WHEN tipo = 'receita' 
        AND status = 'pago' 
        AND data_pagamento BETWEEN p_data_inicio AND p_data_fim 
      THEN valor 
      ELSE 0 
    END), 0) - COALESCE(SUM(CASE 
      WHEN tipo = 'despesa' 
        AND status = 'pago' 
        AND data_pagamento BETWEEN p_data_inicio AND p_data_fim 
      THEN valor 
      ELSE 0 
    END), 0) AS saldo,
    
    -- Total de inadimplência (todos os atrasados, sem filtro de data)
    COALESCE(SUM(CASE 
      WHEN status = 'atrasado' 
      THEN valor 
      ELSE 0 
    END), 0) AS total_inadimplencia
    
  FROM public.lancamentos_financeiros
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
\n
-- ==============================\n-- FILE: 20251109135611_8c123e04-efbc-4880-8271-2de2f87bccd7.sql\n-- ==============================\n
-- Remover trigger primeiro, depois função, e recriar com search_path
DROP TRIGGER IF EXISTS check_lancamento_status ON public.lancamentos_financeiros;
DROP FUNCTION IF EXISTS public.update_lancamento_status();

-- Recriar função com search_path seguro
CREATE OR REPLACE FUNCTION public.update_lancamento_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se foi pago, muda para 'pago'
  IF NEW.data_pagamento IS NOT NULL AND NEW.status = 'pendente' THEN
    NEW.status := 'pago';
  END IF;
  
  -- Se não foi pago e está vencido, muda para 'atrasado'
  IF NEW.data_pagamento IS NULL 
     AND NEW.status = 'pendente' 
     AND NEW.data_vencimento < CURRENT_DATE THEN
    NEW.status := 'atrasado';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER check_lancamento_status
  BEFORE INSERT OR UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lancamento_status();
\n
-- ==============================\n-- FILE: 20251111225213_35bb7473-48ff-4e24-9e82-15b0a1e3943d.sql\n-- ==============================\n
-- PARTE 1: Adicionar novos valores ao enum app_role
-- Esta migração só adiciona os valores ao enum

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'trial';
\n
-- ==============================\n-- FILE: 20251111225351_1ae1056b-f4c7-4a9f-9f64-b0863a797494.sql\n-- ==============================\n
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
\n
-- ==============================\n-- FILE: 20251111225453_6ef2d1ee-9a0a-476f-97e9-39baf183d69e.sql\n-- ==============================\n
-- Atualizar role do Wyldwagner para super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = 'f58029a0-98b3-4da6-ba37-fdc7a2df4ba3';
\n
-- ==============================\n-- FILE: 20251111230301_f3d64340-2a48-4557-815b-1033a53223b6.sql\n-- ==============================\n
-- Update RLS policies for profiles to include account-based access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Admins can view profiles in their account
CREATE POLICY "Admins can view profiles in their account"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND account_id = get_user_account_id(auth.uid())
);

-- Admins can update profiles in their account
CREATE POLICY "Admins can update profiles in their account"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND account_id = get_user_account_id(auth.uid())
);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Update RLS policies for properties to include account-based access
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;

-- Account members can view properties in their account
CREATE POLICY "Account members can view properties"
ON public.properties
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

-- Account members can insert properties
CREATE POLICY "Account members can insert properties"
ON public.properties
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

-- Account members can update properties in their account
CREATE POLICY "Account members can update properties"
ON public.properties
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

-- Account members can delete properties in their account
CREATE POLICY "Account members can delete properties"
ON public.properties
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for contracts
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;

CREATE POLICY "Account members can view contracts"
ON public.contracts
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert contracts"
ON public.contracts
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update contracts"
ON public.contracts
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete contracts"
ON public.contracts
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for invoices
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;

CREATE POLICY "Account members can view invoices"
ON public.invoices
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update invoices"
ON public.invoices
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete invoices"
ON public.invoices
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for lancamentos_financeiros
DROP POLICY IF EXISTS "Users can view their own lancamentos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can insert their own lancamentos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can update their own lancamentos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can delete their own lancamentos" ON public.lancamentos_financeiros;

CREATE POLICY "Account members can view lancamentos"
ON public.lancamentos_financeiros
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert lancamentos"
ON public.lancamentos_financeiros
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update lancamentos"
ON public.lancamentos_financeiros
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete lancamentos"
ON public.lancamentos_financeiros
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for contacts
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

CREATE POLICY "Account members can view contacts"
ON public.contacts
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert contacts"
ON public.contacts
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update contacts"
ON public.contacts
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete contacts"
ON public.contacts
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for scheduled_visits
DROP POLICY IF EXISTS "Users can view their own scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Users can create their own scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Users can update their own scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Users can delete their own scheduled visits" ON public.scheduled_visits;

CREATE POLICY "Account members can view scheduled visits"
ON public.scheduled_visits
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can create scheduled visits"
ON public.scheduled_visits
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update scheduled visits"
ON public.scheduled_visits
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete scheduled visits"
ON public.scheduled_visits
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));
\n
-- ==============================\n-- FILE: 20260211231146_99e36dcb-ed78-4967-b33b-e0882bbae1ca.sql\n-- ==============================\n

-- Fase 1.1: Campos de controle de publicação em properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS publish_to_portals BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS portal_listing_id TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS portal_last_sync TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS portal_status TEXT DEFAULT 'draft';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'rent';

-- Fase 1.2: Tabela de configuração de portais por conta
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

-- Fase 1.3: Tabela de logs de sincronização
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

-- RLS para portal_integrations
ALTER TABLE public.portal_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view portal integrations"
  ON public.portal_integrations FOR SELECT
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert portal integrations"
  ON public.portal_integrations FOR INSERT
  WITH CHECK (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can update portal integrations"
  ON public.portal_integrations FOR UPDATE
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete portal integrations"
  ON public.portal_integrations FOR DELETE
  USING (account_id = get_user_account_id(auth.uid()));

-- RLS para portal_sync_logs
ALTER TABLE public.portal_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view sync logs"
  ON public.portal_sync_logs FOR SELECT
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Service role can insert sync logs"
  ON public.portal_sync_logs FOR INSERT
  WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_portal_integrations_account_id ON public.portal_integrations(account_id);
CREATE INDEX IF NOT EXISTS idx_portal_sync_logs_account_id ON public.portal_sync_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_portal_sync_logs_property_id ON public.portal_sync_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_properties_publish_to_portals ON public.properties(publish_to_portals) WHERE publish_to_portals = true;

-- Trigger de updated_at para portal_integrations
CREATE TRIGGER update_portal_integrations_updated_at
  BEFORE UPDATE ON public.portal_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
\n
-- ==============================\n-- FILE: 20260310214148_80bc43eb-732f-4caa-8443-6fb35a0f3644.sql\n-- ==============================\n

-- Etapa 1: Coluna invoice_id em lancamentos_financeiros
ALTER TABLE public.lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_invoice_id
  ON public.lancamentos_financeiros(invoice_id)
  WHERE invoice_id IS NOT NULL;

-- Etapa 2: Trigger sync invoice → lancamento
CREATE OR REPLACE FUNCTION public.sync_invoice_to_lancamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'paid' THEN
    UPDATE public.lancamentos_financeiros
    SET
      status = 'pago',
      data_pagamento = COALESCE(NEW.payment_date, CURRENT_DATE),
      updated_at = now()
    WHERE invoice_id = NEW.id
      AND status != 'pago';

  ELSIF NEW.status = 'cancelled' THEN
    UPDATE public.lancamentos_financeiros
    SET
      status = 'cancelado',
      updated_at = now()
    WHERE invoice_id = NEW.id
      AND status NOT IN ('pago', 'cancelado');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_invoice_to_lancamento
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_to_lancamento();

-- Etapa 3: Trigger de status automático em invoices
CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_date IS NOT NULL AND (OLD IS NULL OR OLD.payment_date IS NULL) THEN
    NEW.status := 'paid';
  END IF;

  IF NEW.payment_date IS NULL
     AND NEW.status = 'pending'
     AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_invoice_status
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_status();
\n
-- ==============================\n-- FILE: 20260311130148_d685442f-fe61-43e0-ad92-1d2501560a45.sql\n-- ==============================\n
UPDATE invoices SET account_id = c.account_id FROM contracts c WHERE invoices.contract_id = c.id AND invoices.account_id IS NULL AND c.account_id IS NOT NULL;

UPDATE lancamentos_financeiros SET account_id = c.account_id FROM contracts c WHERE lancamentos_financeiros.id_contrato = c.id AND lancamentos_financeiros.account_id IS NULL AND c.account_id IS NOT NULL;
\n
-- ==============================\n-- FILE: 20260311221214_3c9a1495-0377-456a-ae74-efa2edd09577.sql\n-- ==============================\n
-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for contract-documents bucket
CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can view contract documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can delete contract documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contract-documents');

-- Add documents column to contracts table
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;
\n
-- ==============================\n-- FILE: 20260312122512_8eecd45b-b57e-45eb-9606-2248307d3fcc.sql\n-- ==============================\n
-- Vincular Mayara à conta do Wyldwagner
UPDATE profiles 
SET account_id = '8a96b440-23ee-40b4-a661-ed0ea86534be', 
    full_name = 'Mayara' 
WHERE id = '90aef40c-55b5-427e-8ad2-dadd3081109c';

-- Atualizar role para 'agenda' (funcionária)
UPDATE user_roles 
SET role = 'agenda' 
WHERE user_id = '90aef40c-55b5-427e-8ad2-dadd3081109c';
\n
-- ==============================\n-- FILE: 20260312194702_d239e6d4-4d7b-408c-951e-cf352dedd599.sql\n-- ==============================\n
-- Corrigir os 5 ex-moradores que estão como active: mudar para inactive e ex_inquilino
UPDATE contacts 
SET status = 'inactive', contact_type = 'ex_inquilino', updated_at = now()
WHERE document IN ('149.923.139-30', '131.983.129-06', '122.737.269-88', '649.893.489-15', '036.740.102-91');

-- Padronizar os 11 ex-moradores já inativos: mudar contact_type para ex_inquilino
UPDATE contacts 
SET contact_type = 'ex_inquilino', updated_at = now()
WHERE document IN ('09598306933', '08293734973', '07720695909', '05870717965', '10472105922', '14992313930', '13198312906', '46276942880', '12738497950', '60416820395', '12273726988', '70950974455', '61727183398', '04924131938')
AND status = 'inactive';
\n
-- ==============================\n-- FILE: 20260312194924_022f99b4-0bce-4f07-85f8-712748748877.sql\n-- ==============================\n
-- Corrigir todos os imóveis "available" que deveriam ser "rented"
-- Manter available APENAS: AP 8 - Bloco 2, AP 26 - Bloco 2, AP 4 - Bloco 1, AP 301/306/307/310/314 - Bloco 3
UPDATE properties 
SET status = 'rented', updated_at = now()
WHERE status = 'available'
AND name NOT IN (
  'AP 8 - Bloco 2',
  'AP 26 - Bloco 2',
  'AP 4 - Bloco 1',
  'AP 301 - Bloco 3',
  'AP 306 - Bloco 3',
  'AP 307 - Bloco 3',
  'AP 310 - Bloco 3',
  'AP 314 - Bloco 3'
);
\n
-- ==============================\n-- FILE: 20260312195416_e72ff052-5eb6-4570-9a1b-d6d2c0a8182a.sql\n-- ==============================\n
-- AP 101 (AP 01 - Bloco 1): Titular Victoria, co-tenant Amanda Toledo
UPDATE contracts SET co_tenants = '[{"name":"Amanda Toledo Piza de Melo e Silva","document":"106.221.259-23"}]'::jsonb, updated_at = now()
WHERE id = '77a72da8-01e0-4f24-af07-936633fe3978';

-- AP 103 (AP 3 - Bloco 1): Titular Leandro, co-tenant Amanda Martins
UPDATE contracts SET co_tenants = '[{"name":"Amanda Martins De Morais","document":"138.205.559-51"}]'::jsonb, updated_at = now()
WHERE id = 'ea9e656d-9651-4d1d-b6cf-6681237cd0c7';

-- AP 106 (AP 6 - Bloco 1): Titular Amanda Alves, co-tenant Juliano
UPDATE contracts SET co_tenants = '[{"name":"Juliano Rodrigues Ferreira","document":"132.948.119-42"}]'::jsonb, updated_at = now()
WHERE id = '03310b38-0f28-4411-9177-5ed403f07649';

-- AP 117 (AP 17 - Bloco 1): Titular Francisco Kawan, co-tenant Luiza
UPDATE contracts SET co_tenants = '[{"name":"Luiza Oliveira Hans","document":"462.727.018-61"}]'::jsonb, updated_at = now()
WHERE id = 'd2631526-75ee-4ff6-8ee0-fb403312acea';

-- AP 215 (AP 15 - Bloco 2): Titular Cassia, co-tenant Elvis
UPDATE contracts SET co_tenants = '[{"name":"Elvis Henrique de Araujo Selzelein","document":"130.393.409-48"}]'::jsonb, updated_at = now()
WHERE id = 'ad80a297-6bcf-45aa-9522-6725a62c8f6e';

-- AP 221 (AP 21 - Bloco 2): Titular Claudio, co-tenant Leandro Campos
UPDATE contracts SET co_tenants = '[{"name":"Leandro Campos de Amorim","document":"010.657.649-60"}]'::jsonb, updated_at = now()
WHERE id = 'b09e447a-6916-4e87-9f13-bb3a5eb0b010';

-- AP 222 (AP 22 - Bloco 2): Titular Lucas, co-tenant Julia
UPDATE contracts SET co_tenants = '[{"name":"Julia Silva Roberto","document":"156.160.129-20"}]'::jsonb, updated_at = now()
WHERE id = '4fc34876-2a15-4fc1-a9ce-a81aeefa4f00';

-- AP 229 (AP 29 - Bloco 2): Titular Cintia, co-tenant Roberth
UPDATE contracts SET co_tenants = '[{"name":"Roberth Wallan Lima","document":"465.866.098-95"}]'::jsonb, updated_at = now()
WHERE id = 'cd341a3b-611b-4954-816d-f8902c9e3594';

-- AP 304 (AP 304 - Bloco 3): Titular Fabio, co-tenant Carolina
UPDATE contracts SET co_tenants = '[{"name":"Carolina De Fatima Xavier","document":"159.896.349-00"}]'::jsonb, updated_at = now()
WHERE id = 'd74a507e-f5d0-4aec-8929-fb723622c89a';

-- AP 116: Higor tem contrato no AP 3 - Bloco 1 por erro. Corrigir o property_id para AP 16 - Bloco 1
-- Primeiro precisamos do ID do AP 16 - Bloco 1
UPDATE contracts 
SET property_id = (SELECT id FROM properties WHERE name = 'AP 16 - Bloco 1' LIMIT 1),
    co_tenants = '[{"name":"Vitoria Demenjon dos Santos","document":"143.963.799-78"}]'::jsonb,
    updated_at = now()
WHERE id = '9ee34653-25de-4604-9171-e3631dc89494';
\n
-- ==============================\n-- FILE: 20260312195714_81af684b-1a7f-40fe-83fa-b677e061d461.sql\n-- ==============================\n
UPDATE contracts SET status = 'terminated', updated_at = now() WHERE id = 'f8489c6a-2570-4808-96a9-45caab3cfd9c';
\n
-- ==============================\n-- FILE: 20260312195850_29e4f674-8e1e-45ad-9716-2bfce01d4f8b.sql\n-- ==============================\n
UPDATE invoices i
SET property_id = c.property_id
FROM contracts c
WHERE i.contract_id = c.id
  AND i.property_id IS NULL
  AND c.property_id IS NOT NULL;
\n
-- ==============================\n-- FILE: 20260313130427_8d8d6832-cb0e-4f09-b3ec-25db34d0006e.sql\n-- ==============================\n
DELETE FROM accounts WHERE id = 'f2d98e05-1ee7-4526-822c-b057a6b065b0';
\n
-- ==============================\n-- FILE: 20260313131449_7efef49b-8366-4537-a28b-95929da8c8f2.sql\n-- ==============================\n
-- Step 1: Delete orphan lancamentos_financeiros linked to duplicate invoices that will be removed
DELETE FROM lancamentos_financeiros
WHERE invoice_id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY contract_id, reference_month ORDER BY created_at ASC) as rn
    FROM invoices
    WHERE contract_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Delete duplicate invoices (keep the first created one per contract+month)
DELETE FROM invoices
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY contract_id, reference_month ORDER BY created_at ASC) as rn
    FROM invoices
    WHERE contract_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 3: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_invoices_contract_reference_unique 
ON invoices (contract_id, reference_month) 
WHERE contract_id IS NOT NULL;
\n
-- ==============================\n-- FILE: 20260313161818_3f8db27e-a787-48a4-ad2d-faec4cd8f780.sql\n-- ==============================\n
-- Atualizar contrato da Larissa com dados completos do PDF
UPDATE public.contracts
SET
  rental_value = 650.00,
  payment_day = 6,
  pre_paid = true,
  tenant_rg = '13.547.626-9 / IIPR',
  tenant_profession = 'Analista de Sistemas',
  adjustment_index = 'IPCA+',
  guarantee_type = 'caucao_dinheiro',
  guarantee_value = 650.00,
  updated_at = now()
WHERE id = '15b11e0c-4b6b-48bc-a61e-a4342fe48ad6';

-- Atualizar dados do proprietário no imóvel
UPDATE public.properties
SET
  owner_email = 'wyldwagnericm@gmail.com',
  owner_contact = '(41) 98452-0339',
  updated_at = now()
WHERE id = '9680d22d-68d1-4a11-9223-f5c9325fba07';
\n
-- ==============================\n-- FILE: 20260316153430_2506156f-c10c-4b44-8fad-eb88c01e2edb.sql\n-- ==============================\n

-- Table to store manual name-to-contract mappings for bank reconciliation
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

ALTER TABLE public.extrato_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view aliases"
  ON public.extrato_aliases FOR SELECT TO authenticated
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert aliases"
  ON public.extrato_aliases FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can update aliases"
  ON public.extrato_aliases FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete aliases"
  ON public.extrato_aliases FOR DELETE TO authenticated
  USING (account_id = get_user_account_id(auth.uid()));
\n
-- ==============================\n-- FILE: 20260316163805_7394190d-0e32-4ba6-825e-44646b07fb31.sql\n-- ==============================\n
UPDATE contracts SET tenant_name = 'Ademir Ramos Dos Santos Junior', rental_value = 850.00, payment_day = 5, tenant_document = '07563966544', tenant_phone = '(71) 9349-9482', tenant_email = 'ramosjunior751@gmail.com' WHERE id = '8fadb845-1589-419d-a02c-18e7e0c89568';
UPDATE contracts SET tenant_name = 'Adriane Isabella Batista', rental_value = 850.00, payment_day = 5, tenant_document = '11783191996', tenant_phone = '(41) 9631-5919', tenant_email = 'Abella084@gmail.com' WHERE id = '1d7bcba1-9665-4167-a4d8-e74c9a38bc62';
UPDATE contracts SET tenant_name = 'Amanda Alves Moreira Ferreira', rental_value = 850.00, payment_day = 5, tenant_document = '11653555904', tenant_phone = '(41) 9546-0248', tenant_email = 'amandaalvesmf00@gmail.com' WHERE id = '03310b38-0f28-4411-9177-5ed403f07649';
UPDATE contracts SET tenant_name = 'Ana Clara Gomes Martins', rental_value = 850.00, payment_day = 5, tenant_document = '13645852948', tenant_phone = '(41) 9895-7467', tenant_email = 'aclaragomes555@gmail.com' WHERE id = 'c22c120c-b236-40c3-baae-2ad4c6563992';
UPDATE contracts SET tenant_name = 'Aramis Orival de Araujo', rental_value = 850.00, payment_day = 5, tenant_document = '05625684928', tenant_phone = '(42) 9832-4737', tenant_email = 'aramis.araujo@hotmail.com' WHERE id = '759aec51-7aa8-4c0c-877d-01b4bd4756b2';
UPDATE contracts SET tenant_name = 'BRENO FERREIRA SOARES', rental_value = 850.00, payment_day = 5, tenant_document = '70952068133', tenant_phone = '(41) 9966-5058', tenant_email = 'imbrenoferreira@gmail.com' WHERE id = '708262ec-f46d-412a-947a-71b58c1279bd';
UPDATE contracts SET tenant_name = 'Carolina De Fatima Xavier', rental_value = 850.00, payment_day = 5, tenant_document = '15989634900', tenant_phone = '(41) 9875-5060', tenant_email = 'carolinacoraline888@gmail.com' WHERE id = '5cec40d7-86df-40ae-8308-8a36ab5c7363';
UPDATE contracts SET tenant_name = 'Caroline Gil Da Luz', rental_value = 850.00, payment_day = 5, tenant_document = '16658390908', tenant_phone = '(41) 8868-9021', tenant_email = 'Carolzinhaxp23@gmail.com' WHERE id = '182f8e84-98db-468a-a82a-c700da127a03';
UPDATE contracts SET tenant_name = 'Cassia Raquel Lemos de Matos', rental_value = 850.00, payment_day = 5, tenant_document = '14128964956', tenant_phone = '(41) 9970-1841', tenant_email = 'cassiaraquel209@gmail.com' WHERE id = 'ad80a297-6bcf-45aa-9522-6725a62c8f6e';
UPDATE contracts SET tenant_name = 'Celso Roberto Aparecido Theodoro Filho', rental_value = 850.00, payment_day = 5, tenant_document = '27917345890', tenant_phone = '(41) 9177-9361', tenant_email = 'cftheodoro120@gmail.com' WHERE id = '0acd26bd-18a1-40e2-83ae-1a95a887e1ef';
UPDATE contracts SET tenant_name = 'cintia de paula lima', rental_value = 850.00, payment_day = 5, tenant_document = '36090554804', tenant_phone = '(13) 8176-5027', tenant_email = 'lourivalrosa799@gmail.com' WHERE id = 'cd341a3b-611b-4954-816d-f8902c9e3594';
UPDATE contracts SET tenant_name = 'Claudenir Vieira Meda', rental_value = 850.00, payment_day = 5, tenant_document = '08293734973', tenant_phone = '(41) 9992-8541', tenant_email = 'claudenirvieira90@gmail.com' WHERE id = '31296488-e88f-4e35-aeb2-28bb2994fda1';
UPDATE contracts SET tenant_name = 'Claudio Moreira Duarte', rental_value = 850.00, payment_day = 5, tenant_document = '97883506900', tenant_phone = '(16) 9 9155-8861', tenant_email = 'Bruscouco2@gmail.com' WHERE id = 'b09e447a-6916-4e87-9f13-bb3a5eb0b010';
UPDATE contracts SET tenant_name = 'Dailyn Oviedo Guerra', rental_value = 850.00, payment_day = 5, tenant_document = '11876116200', tenant_phone = '(41) 9958-3532', tenant_email = 'dailynoviedoguerra@gmail.com' WHERE id = '0b37404e-5fea-45d5-9bc8-e1211e766227';
UPDATE contracts SET tenant_name = 'Danilo Dias Magno', rental_value = 850.00, payment_day = 5 WHERE id = '05c31cb9-3d71-4964-95bd-54df79324516';
UPDATE contracts SET tenant_name = 'Diego Felipe Pedroso Mauricio', rental_value = 850.00, payment_day = 5, tenant_document = '08820497980', tenant_phone = '(41) 9677-1092', tenant_email = 'Pedrosodiego914@gmail.com' WHERE id = 'b8acc868-c32e-40a5-8a3a-5dd4ba2345c6';
UPDATE contracts SET tenant_name = 'Edi carlos Alves Santana', rental_value = 850.00, payment_day = 5, tenant_document = '08437276918', tenant_phone = '(41) 9808-2855', tenant_email = 'edicarlos.santana2019@gmail.com' WHERE id = 'efc106b0-d0f4-487c-9bf4-15851edf55db';
UPDATE contracts SET tenant_name = 'Eduardo Vilarins Junior', rental_value = 850.00, payment_day = 5, tenant_document = '28478078886', tenant_phone = '(41) 9 9812-1277', tenant_email = 'eduardovilarins@yahoo.com.br' WHERE id = 'a7a6aa1c-aae4-4568-835d-db97dc5342de';
UPDATE contracts SET tenant_name = 'EMANUELE GUERREIRO ORTELA', rental_value = 850.00, payment_day = 5, tenant_document = '04781101976', tenant_phone = '(41) 9910-4597', tenant_email = 'emanueleortela@gmail.com' WHERE id = '2ad0c04d-021b-4f29-97df-ad853b82be13';
UPDATE contracts SET tenant_name = 'ERICA RAMOS VIEIRA', rental_value = 850.00, payment_day = 5, tenant_document = '09289502983', tenant_phone = '(41) 8848-0525', tenant_email = 'ericaramosvieira98@gmail.com' WHERE id = '6b491cf4-bc30-4256-bd4e-d647e05036bb';
UPDATE contracts SET tenant_name = 'Ericka Sabrina Jofre', rental_value = 850.00, payment_day = 5 WHERE id = '62250925-8882-4b39-96f4-8b6fc5e7e315';
UPDATE contracts SET tenant_name = 'Fabio de Oliveira', rental_value = 850.00, payment_day = 5, tenant_document = '04640036957', tenant_phone = '(41) 9815-1347', tenant_email = 'fabiothermopress@gmail.com' WHERE id = 'd74a507e-f5d0-4aec-8929-fb723622c89a';
UPDATE contracts SET tenant_name = 'Fernanda Crystyna Pereira da Silva', rental_value = 850.00, payment_day = 5, tenant_document = '13957737931', tenant_phone = '(41) 9235-2976', tenant_email = 'fernanda.crystyna.ifpr@gmail.com' WHERE id = '55f010be-4351-4441-bfd2-c8841fac5f08';
UPDATE contracts SET tenant_name = 'Francelina Pereira dos Passos', rental_value = 850.00, payment_day = 5, tenant_document = '02412345902', tenant_phone = '(41) 9510-0960', tenant_email = 'franpereirapassos56@gmail.com' WHERE id = 'b74d5eac-28b6-4bf6-94a3-a4efdd23d1b5';
UPDATE contracts SET tenant_name = 'Francisco Eriberto Moura Oliveira', rental_value = 850.00, payment_day = 5, tenant_document = '61733008349', tenant_phone = '(41) 9639-2823', tenant_email = 'Franciscoeribertomouraoliveira@gmail.com' WHERE id = 'cc682292-803b-4855-b5eb-26887beb20ab';
UPDATE contracts SET tenant_name = 'Francisco Kawan de Oliveira', rental_value = 850.00, payment_day = 5, tenant_document = '49724291863', tenant_phone = '(13) 9799-0988', tenant_email = 'aries.20002010@hotmail.com' WHERE id = 'd2631526-75ee-4ff6-8ee0-fb403312acea';
UPDATE contracts SET tenant_name = 'Gustavo Araujo da Silva', rental_value = 850.00, payment_day = 5, tenant_document = '07193846485', tenant_phone = '(41) 9182-8407', tenant_email = 'gustavoarauj5630@gmail.com' WHERE id = '39cabb0d-c24b-44e7-9848-1f1642d65137';
UPDATE contracts SET tenant_name = 'HENRIQUE SIQUEIRA DE ABREU', rental_value = 850.00, payment_day = 5, tenant_document = '07425719983', tenant_phone = '(41) 9 9642-9617', tenant_email = 'rickabreu2412@gmail.com' WHERE id = 'bae3a6be-9e4e-4c74-a617-5ce1148753a7';
UPDATE contracts SET tenant_name = 'Higor Milioranca Monteiro', rental_value = 850.00, payment_day = 5, tenant_document = '15119516998', tenant_phone = '(41) 9510-7415', tenant_email = 'Higormonteiro32@gmail.com' WHERE id = '9ee34653-25de-4604-9171-e3631dc89494';
UPDATE contracts SET tenant_name = 'Jeanine Machado Morais', rental_value = 850.00, payment_day = 5, tenant_document = '01289467927', tenant_phone = '(41) 9738-8309', tenant_email = 'jeaninemoraes03@gmail.com' WHERE id = '4b9bc0cc-4b04-4381-9316-899c4951f39a';
UPDATE contracts SET tenant_name = 'JHENIFFER GABRIELLY COSTA VIEIRA THOMAZ', rental_value = 850.00, payment_day = 5, tenant_document = '11257800965', tenant_phone = '(41) 9 9784-8065', tenant_email = 'Jhenyoliveira233@gmail.com' WHERE id = '23266762-37e0-4898-9e17-0ebf2de4d991';
UPDATE contracts SET tenant_name = 'Joao Pedro Cabral De Barros Florencio', rental_value = 850.00, payment_day = 5 WHERE id = 'd8accd8f-ecc6-4847-b201-b927de1b4641';
UPDATE contracts SET tenant_name = 'Jose Gabriel Lessa', rental_value = 850.00, payment_day = 5, tenant_document = '10399421998', tenant_phone = '(41) 8466-6923', tenant_email = 'Josegabriellessa@gmail.com' WHERE id = '2afb63a2-d8fd-44b7-8553-305acde4def5';
UPDATE contracts SET tenant_name = 'Julia Porteiro Rossi de Campos', rental_value = 850.00, payment_day = 5, tenant_document = '13198312906', tenant_phone = '(41) 9816-0547', tenant_email = 'juliaporteiro0405@gmail.com' WHERE id = '92872ca3-9a8f-490b-82b7-de515a768ee3';
UPDATE contracts SET tenant_name = 'Juliana Bento', rental_value = 850.00, payment_day = 5, tenant_document = '08310959974', tenant_phone = '(41) 9199-9798', tenant_email = 'julianabento.jotabe@gmail.com' WHERE id = 'ec5d0c23-c99b-4883-be69-0f97f2dfa595';
UPDATE contracts SET tenant_name = 'KASSIA KELLY SOUZA GOMES', rental_value = 850.00, payment_day = 5, tenant_document = '09740826601', tenant_phone = '(47) 9177-4158', tenant_email = 'Kassiakellysouza2001@gmail.com' WHERE id = '70435962-87af-4d47-abdd-b006fa409726';
UPDATE contracts SET tenant_name = 'Kettelen Sabrina Pedroso Xavier', rental_value = 850.00, payment_day = 5 WHERE id = '02e0f0ec-d01d-4734-8e85-37be6819a301';
UPDATE contracts SET tenant_name = 'Kleyton Otavio Serra De Jesus', rental_value = 850.00, payment_day = 5 WHERE id = 'adbe7ee0-db6f-431e-95fe-051908d12322';
UPDATE contracts SET tenant_name = 'Leandro Santos Apolinario Da silva', rental_value = 850.00, payment_day = 5, tenant_document = '14780125952', tenant_phone = '(41) 9959-3163', tenant_email = 'leandroggizz330@gmail.com' WHERE id = 'ea9e656d-9651-4d1d-b6cf-6681237cd0c7';
UPDATE contracts SET tenant_name = 'Lucas de Moraes Lessa', rental_value = 850.00, payment_day = 5, tenant_document = '12955238929', tenant_phone = '(41) 9690-0165', tenant_email = 'lucasdemoraeslessa@gmail.com' WHERE id = 'b8806b36-71f8-499f-8b89-4c99d75ae5b6';
UPDATE contracts SET tenant_name = 'Lucas Guilherme will Mafra', rental_value = 850.00, payment_day = 5, tenant_document = '08289906978', tenant_phone = '(41) 9179-5456', tenant_email = 'Lucasguiwill20@gmail.com' WHERE id = '4fc34876-2a15-4fc1-a9ce-a81aeefa4f00';
UPDATE contracts SET tenant_name = 'Luis Pinedo Guevara', rental_value = 850.00, payment_day = 5, tenant_document = '80274395908', tenant_email = 'lpg.guevarita.1993@gmail.com' WHERE id = 'fccf696a-4008-4a64-b1ce-13bfeed9bef9';
UPDATE contracts SET tenant_name = 'Maria Eduarda De Almeida Moura Tavares', rental_value = 850.00, payment_day = 5, tenant_document = '11024839907', tenant_phone = '(41) 9205-3622', tenant_email = 'Dudatavares10a@gmail.com' WHERE id = 'e84d25ef-8a3e-4bfc-9af7-c08bcf0230f0';
UPDATE contracts SET tenant_name = 'Mariane Afonso Gandin', rental_value = 850.00, payment_day = 5 WHERE id = '506bdade-6dda-4903-a92d-fbe13e7fa593';
UPDATE contracts SET tenant_name = 'Marjory Morais', rental_value = 850.00, payment_day = 5, tenant_document = '12473109907', tenant_phone = '(41) 9127-2465', tenant_email = 'marjory.moraiss@gmail.com' WHERE id = 'a75dee6f-91eb-420a-ae93-367dd14bd521';
UPDATE contracts SET tenant_name = 'Matheus Felipe de Oliveira Tihara', rental_value = 850.00, payment_day = 5, tenant_document = '00935311920', tenant_phone = '(41) 9841-2640', tenant_email = 'matheustiharaps@gmail.com' WHERE id = '51b4cfcc-14c8-458a-b9a1-f12b955de024';
UPDATE contracts SET tenant_name = 'Melina Serra Andre', rental_value = 850.00, payment_day = 5, tenant_document = '04417359911', tenant_phone = '(41) 8867-4042', tenant_email = 'melinaserraandre@gmail.com' WHERE id = '87c871a9-983c-4e76-a328-0f05f6ab3ecc';
UPDATE contracts SET tenant_name = 'Michel Aparecido Silva', rental_value = 850.00, payment_day = 5 WHERE id = 'b8cf2d41-5150-465d-949b-a4150a11c1be';
UPDATE contracts SET tenant_name = 'Miguel de Lima Rodrigues', rental_value = 850.00, payment_day = 5, tenant_document = '60416820395', tenant_phone = '(41) 8850-0196', tenant_email = 'miiguellimaa1@gmail.com' WHERE id = 'e199ef0f-3e7e-445d-9bdf-f9e77691a66b';
UPDATE contracts SET tenant_name = 'Neemyas Costa de Araujo', rental_value = 850.00, payment_day = 5, tenant_document = '70950974455', tenant_phone = '(41) 8513-8996', tenant_email = 'Neemyascosta4@gmail.com' WHERE id = 'a9a04e8f-e1b7-46e5-b33e-0ab097ea03d4';
UPDATE contracts SET tenant_name = 'Nicolas Antonio Salazar Martinez', rental_value = 850.00, payment_day = 5, tenant_document = '71921277106', tenant_phone = '(41) 9 9926-028', tenant_email = 'nicolas88martinez.br@gmail.com' WHERE id = '03a2b2b5-1911-485a-84c0-6c832478d68f';
UPDATE contracts SET tenant_name = 'Paulo Henrique Souza Rego', rental_value = 850.00, payment_day = 5, tenant_document = '04617659269', tenant_phone = '(41) 7403-4555', tenant_email = 'paulo.cometa252830@gmail.com' WHERE id = 'fae71667-f8d6-4d49-a560-6e56e505d28e';
UPDATE contracts SET tenant_name = 'Ritiam Dos Passos Oliveira', rental_value = 850.00, payment_day = 5, tenant_document = '40667394826', tenant_phone = '(41) 9634-3190', tenant_email = 'Olliver88oficial@gmail.com' WHERE id = '913ae1c5-9b3d-41db-8317-fbf6b5e6581c';
UPDATE contracts SET tenant_name = 'Rogerio Martiniano Guerra', rental_value = 850.00, payment_day = 5, tenant_document = '41642515817', tenant_phone = '(41) 8530-9927', tenant_email = 'rogerio.lovis@gmail.com' WHERE id = 'e74e9ad7-133c-4679-ab14-15d20126bb30';
UPDATE contracts SET tenant_name = 'Rogerio Teixeira Pedro', rental_value = 850.00, payment_day = 5, tenant_document = '04924131938', tenant_phone = '(41) 9784-9750', tenant_email = 'roger.c3po69@gmail.com' WHERE id = 'c9fb41a0-b89b-45e8-b6f3-8ad84ca1380c';
UPDATE contracts SET tenant_name = 'Thais Pereira Moller', rental_value = 850.00, payment_day = 5, tenant_document = '10490452973', tenant_phone = '(41) 8456-9328', tenant_email = 'thaispmoller12345@gmail.com' WHERE id = '7538475a-aef6-4d85-8e3d-ac9399d8987c';
UPDATE contracts SET tenant_name = 'Victoria Mariana dos Santos', rental_value = 850.00, payment_day = 5, tenant_document = '09371336986', tenant_phone = '(41) 8768-2304', tenant_email = 'Victoria.mariana.716@gmail.com' WHERE id = '77a72da8-01e0-4f24-af07-936633fe3978';
UPDATE contracts SET tenant_name = 'Vitor Carlos Bezerra Batista', rental_value = 850.00, payment_day = 5, tenant_document = '10011896981', tenant_phone = '(41) 9624-7631', tenant_email = 'vitorbezerra36@gmail.com' WHERE id = 'cbc1fed3-5feb-4e47-931e-c45a29008de7';
UPDATE contracts SET tenant_name = 'Wagner Fortunato do Prado', rental_value = 850.00, payment_day = 5, tenant_document = '83236872934', tenant_phone = '(41) 9910-5059', tenant_email = 'Postowagnerdoprado@gmail.com' WHERE id = '17347143-1180-4158-abb2-af073b02dd80';
UPDATE contracts SET tenant_name = 'Yenifer Viviana Villarroel Mata', rental_value = 850.00, payment_day = 5 WHERE id = '0587a2b7-b526-4f94-b72e-86ceb0555411';
\n
