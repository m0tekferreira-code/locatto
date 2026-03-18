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