# 📖 Documentação Completa — Locatto (Accordous)

> **Última atualização:** Março 2026  
> **Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase  
> **Supabase Project ID:** `yvlzmbamsqzqqbhdrqwk`

---

## 1. Visão Geral

O **Locatto** é um SaaS de gestão imobiliária multi-tenant que permite administradoras e corretores gerenciarem imóveis, contratos, faturas, financeiro, visitas, vistorias e integração com portais imobiliários (ZAP, Viva Real, OLX).

### 1.1 Arquitetura Multi-Tenant

- Cada cliente (admin) possui uma **conta** (`accounts`) isolada
- Todos os dados são vinculados via `account_id`
- Funcionários são vinculados à conta do admin via `profiles.account_id`
- RLS (Row Level Security) garante isolamento total entre contas

### 1.2 Hierarquia de Usuários

| Role | Nível | Descrição |
|------|-------|-----------|
| `super_admin` | Global | Dono do SaaS — acessa tudo |
| `admin` | Tenant | Cliente pagante — gerencia sua conta |
| `full` | Staff | Funcionário com acesso completo |
| `financeiro` | Staff | Acesso ao módulo financeiro |
| `agenda` | Staff | Acesso a agendamentos |
| `cadastro_leads` | Staff | Acesso a leads |
| `sdr` | Staff | Sales Development Representative |
| `suporte` | Staff | Suporte ao cliente |
| `trial` | Onboarding | Novo usuário em teste (14 dias) |

### 1.3 Fluxo de Onboarding (Trial)

1. Usuário acessa `/register` e cria conta
2. Trigger `handle_new_user` cria automaticamente:
   - `accounts` com `subscription_status = 'trial'` e expiração de 14 dias
   - `profiles` vinculado à conta
   - `user_roles` com role `trial` (ou `super_admin` se for o primeiro usuário)
3. Soft paywall via `LicenseProvider` verifica expiração
4. Após 14 dias → modo somente leitura até contratar plano

---

## 2. Rotas da Aplicação

### 2.1 Rotas Públicas
| Rota | Página | Descrição |
|------|--------|-----------|
| `/auth` | Auth | Login |
| `/register` | Register | Registro |
| `/plans` | Plans | Planos disponíveis |
| `/checkout-plan` | CheckoutPlan | Seleção de plano |
| `/checkout` | Checkout | Pagamento |

### 2.2 Rotas Protegidas (requer autenticação)
| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Index | Dashboard principal |
| `/imoveis` | PropertiesList | Lista de imóveis |
| `/imoveis/novo` | PropertyForm | Cadastrar imóvel |
| `/imoveis/:id` | PropertyDetails | Detalhes do imóvel |
| `/imoveis/:id/editar` | PropertyForm | Editar imóvel |
| `/contratos` | ContractsList | Lista de contratos |
| `/contratos/novo/:propertyId` | ContractWizard | Criar contrato |
| `/contratos/:id` | ContractDetails | Detalhes do contrato |
| `/contatos` | ContactsList | Lista de contatos |
| `/contatos/:id` | ContactDetails | Detalhes do contato |
| `/faturas` | InvoicesList | Lista de faturas |
| `/faturas/:id` | InvoiceDetails | Detalhes da fatura |
| `/financeiro` | FinancialDashboard | Dashboard financeiro |
| `/financeiro/baixa` | BaixaPagamentos | Baixa de pagamentos |
| `/documentos` | DocumentsList | Documentos |
| `/visitas` | ScheduledVisits | Visitas agendadas |
| `/vistorias` | InspectionWizard | Vistorias de imóveis |
| `/usuarios` | UsersList | Gestão de usuários |
| `/notificacoes` | NotificationSettings | Configurações de notificação |
| `/relatorios` | ReportsList | Relatórios |
| `/configuracoes` | GeneralSettings | Configurações gerais |
| `/configuracoes/portais` | PortalSettings | Integração com portais |
| `/configuracoes/importar-conciliacao` | ImportConciliacao | Importação de dados XLSX |

### 2.3 Rotas Super Admin
| Rota | Página | Descrição |
|------|--------|-----------|
| `/admin` | AdminDashboard | Dashboard administrativo |
| `/admin/accounts` | AdminAccounts | Gerenciar contas |
| `/admin/payments` | AdminPayments | Pagamentos |
| `/admin/licenses` | LicenseManagement | Licenças |

---

## 3. Banco de Dados — Schema Completo

### 3.1 Diagrama de Relacionamentos

```
auth.users (Supabase managed)
    │
    ├── profiles (1:1) ──────────── accounts (N:1)
    │       │                           │
    │       └── user_roles (1:N)        ├── properties (1:N)
    │                                   │       ├── contracts (1:N)
    │                                   │       │       ├── invoices (1:N)
    │                                   │       │       │       └── lancamentos_financeiros (1:1 via invoice_id)
    │                                   │       │       └── lancamentos_financeiros (1:N via id_contrato)
    │                                   │       ├── scheduled_visits (1:N)
    │                                   │       └── portal_sync_logs (1:N)
    │                                   │
    │                                   ├── contacts (1:N)
    │                                   ├── portal_integrations (1:N)
    │                                   └── portal_sync_logs (1:N)
    │
    ├── leads (1:N)
    │       └── conversations (1:N)
    │               ├── messages (1:N)
    │               └── conversation_summaries (1:1)
    │
    ├── checkout_sessions (1:N)
    ├── payments (1:N)
    └── license_audit (1:N)

billing_plans (standalone)
agent_configs (1:N per user)
whatsapp_logs (standalone)
```

---

### 3.2 Tabelas — Definição Detalhada

#### `accounts`
> Conta principal do tenant (cliente do SaaS).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `owner_id` | uuid | No | — | FK → auth.users (dono da conta) |
| `account_name` | text | No | — | Nome da conta/empresa |
| `subscription_status` | text | No | `'trial'` | Status: trial, active, expired, cancelled |
| `plan_id` | text | Yes | — | Plano contratado |
| `data_expiracao` | timestamptz | Yes | — | Data de expiração da licença |
| `created_at` | timestamptz | No | `now()` | — |
| `updated_at` | timestamptz | No | `now()` | — |

**RLS:** Super admin vê tudo. Owner vê/edita sua conta. Members veem sua conta.

---

#### `profiles`
> Perfil do usuário vinculado à conta.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | — | PK = auth.users.id |
| `full_name` | text | Yes | — | Nome completo |
| `avatar_url` | text | Yes | — | URL do avatar |
| `account_id` | uuid | Yes | — | FK → accounts.id |
| `data_expiracao` | timestamptz | Yes | — | Expiração individual |
| `google_calendar_embed_url` | text | Yes | — | URL embed do Google Calendar |
| `is_active` | boolean | Yes | `true` | Usuário ativo |
| `last_access` | timestamptz | Yes | — | Último acesso |
| `created_at` | timestamptz | Yes | `now()` | — |
| `updated_at` | timestamptz | Yes | `now()` | — |

**RLS:** Usuário vê/edita seu perfil. Admin vê perfis da conta. Super admin vê tudo.

---

#### `user_roles`
> Roles dos usuários (NUNCA armazenar em profiles!).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | FK → auth.users |
| `role` | app_role (enum) | No | — | Role do usuário |
| `created_at` | timestamptz | Yes | `now()` | — |

**Enum `app_role`:** `admin`, `sdr`, `suporte`, `full`, `agenda`, `cadastro_leads`, `financeiro`, `super_admin`, `trial`

**RLS:** Admins gerenciam roles. Usuários veem suas próprias.

---

#### `properties`
> Imóveis cadastrados.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | Criador |
| `account_id` | uuid | Yes | — | FK → accounts |
| `name` | text | No | — | Nome/identificação |
| `property_type` | text | No | — | Tipo (casa, apto, etc) |
| `classification` | text | Yes | — | Classificação |
| `status` | text | No | `'available'` | available, rented, maintenance, unavailable |
| `address` | text | No | — | Endereço |
| `number` | text | Yes | — | Número |
| `complement` | text | Yes | — | Complemento |
| `neighborhood` | text | Yes | — | Bairro |
| `city` | text | No | — | Cidade |
| `state` | text | No | — | Estado |
| `country` | text | Yes | `'Brasil'` | País |
| `postal_code` | text | Yes | — | CEP |
| `total_area` | numeric | Yes | — | Área total (m²) |
| `built_area` | numeric | Yes | — | Área construída |
| `useful_area` | numeric | Yes | — | Área útil |
| `land_area` | numeric | Yes | — | Área do terreno |
| `construction_year` | integer | Yes | — | Ano de construção |
| `owner_name` | text | Yes | — | Nome do proprietário |
| `owner_contact` | text | Yes | — | Contato do proprietário |
| `owner_email` | text | Yes | — | Email do proprietário |
| `registry_data` | text | Yes | — | Dados de matrícula |
| `cover_photo` | text | Yes | — | URL foto de capa |
| `photos` | text[] | Yes | `'{}'` | Array de URLs de fotos |
| `documents` | jsonb | Yes | `'[]'` | Documentos vinculados |
| `linked_persons` | jsonb | Yes | `'[]'` | Pessoas vinculadas |
| `nearby_facilities` | jsonb | Yes | `'{}'` | Facilidades próximas |
| `publish_to_portals` | boolean | Yes | `false` | Publicar nos portais |
| `portal_status` | text | Yes | `'draft'` | draft, published, error |
| `portal_listing_id` | text | Yes | — | ID do anúncio no portal |
| `portal_last_sync` | timestamptz | Yes | — | Última sincronização |
| `transaction_type` | text | Yes | `'rent'` | rent, sale, both |
| `created_at` | timestamptz | Yes | `now()` | — |
| `updated_at` | timestamptz | Yes | `now()` | — |

**RLS:** Isolamento por account_id. Members da conta têm CRUD completo.

---

#### `contracts`
> Contratos de locação.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | Criador |
| `account_id` | uuid | Yes | — | FK → accounts |
| `property_id` | uuid | Yes | — | FK → properties |
| `contract_number` | text | Yes | — | Número do contrato |
| `tenant_name` | text | No | — | Nome do inquilino |
| `tenant_document` | text | Yes | — | CPF/CNPJ |
| `tenant_rg` | text | Yes | — | RG |
| `tenant_phone` | text | Yes | — | Telefone |
| `tenant_email` | text | Yes | — | Email |
| `tenant_profession` | text | Yes | — | Profissão |
| `tenant_emergency_phone` | text | Yes | — | Telefone emergência |
| `start_date` | date | No | — | Início do contrato |
| `end_date` | date | Yes | — | Fim do contrato |
| `rental_value` | numeric | No | — | Valor do aluguel |
| `payment_day` | integer | Yes | `5` | Dia de vencimento |
| `payment_method` | text | Yes | `'bank_transfer'` | Método de pagamento |
| `guarantee_type` | text | Yes | — | Tipo de garantia |
| `guarantee_value` | numeric | Yes | — | Valor da garantia |
| `adjustment_index` | text | Yes | — | Índice de reajuste |
| `pre_paid` | boolean | Yes | `false` | Pré-pago |
| `status` | text | No | `'active'` | active, expired, cancelled |
| `co_tenants` | jsonb | Yes | `'[]'` | Co-inquilinos |
| `extra_charges` | jsonb | Yes | `'[]'` | Cobranças extras |
| `documents` | jsonb | Yes | `'[]'` | Documentos vinculados (PDFs) |
| `created_at` | timestamptz | Yes | `now()` | — |
| `updated_at` | timestamptz | Yes | `now()` | — |

---

#### `invoices`
> Faturas geradas a partir dos contratos.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | Criador |
| `account_id` | uuid | Yes | — | FK → accounts |
| `contract_id` | uuid | Yes | — | FK → contracts |
| `property_id` | uuid | Yes | — | FK → properties |
| `invoice_number` | text | Yes | — | Número da fatura |
| `reference_month` | date | No | — | Mês de referência |
| `issue_date` | date | No | `CURRENT_DATE` | Data de emissão |
| `due_date` | date | No | — | Data de vencimento |
| `payment_date` | date | Yes | — | Data de pagamento |
| `payment_method` | text | Yes | — | Método de pagamento |
| `status` | text | No | `'pending'` | pending, paid, overdue, cancelled |
| `rental_amount` | numeric | No | `0` | Valor do aluguel |
| `water_amount` | numeric | Yes | `0` | Água |
| `electricity_amount` | numeric | Yes | `0` | Energia |
| `gas_amount` | numeric | Yes | `0` | Gás |
| `internet_amount` | numeric | Yes | `0` | Internet |
| `condo_fee` | numeric | Yes | `0` | Condomínio |
| `guarantee_installment` | numeric | Yes | `0` | Parcela de garantia |
| `guarantee_installment_number` | integer | Yes | — | Nº da parcela |
| `extra_charges` | jsonb | Yes | `'[]'` | Cobranças extras |
| `total_amount` | numeric | No | — | Valor total |
| `notes` | text | Yes | — | Observações |
| `bank_data` | jsonb | Yes | — | Dados bancários |
| `history` | jsonb | Yes | `'[]'` | Histórico de alterações |
| `created_at` | timestamptz | Yes | `now()` | — |
| `updated_at` | timestamptz | Yes | `now()` | — |

---

#### `lancamentos_financeiros`
> Lançamentos financeiros (receitas e despesas). Fonte de verdade do dashboard financeiro.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | Criador |
| `account_id` | uuid | Yes | — | FK → accounts |
| `id_contrato` | uuid | Yes | — | FK → contracts |
| `id_imovel` | uuid | Yes | — | FK → properties |
| `invoice_id` | uuid | Yes | — | FK → invoices (vínculo 1:1 com fatura) |
| `tipo` | lancamento_tipo (enum) | No | — | `receita` ou `despesa` |
| `valor` | numeric | No | — | Valor |
| `descricao` | text | Yes | — | Descrição |
| `categoria` | text | Yes | — | Categoria |
| `data_vencimento` | date | No | — | Data de vencimento |
| `data_pagamento` | date | Yes | — | Data de pagamento |
| `status` | lancamento_status (enum) | No | `'pendente'` | `pendente`, `pago`, `atrasado`, `cancelado` |
| `observacoes` | text | Yes | — | Observações |
| `created_at` | timestamptz | Yes | `now()` | — |
| `updated_at` | timestamptz | Yes | `now()` | — |

**Triggers:**
- `update_lancamento_status` — Auto-atualiza status para `pago` quando `data_pagamento` é preenchida, ou `atrasado` quando vence
- `sync_invoice_to_lancamento` — Sincroniza status da fatura para o lançamento vinculado

---

#### `contacts`
> Contatos (proprietários, inquilinos, fiadores, leads, ex-inquilinos).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | Criador |
| `account_id` | uuid | Yes | — | FK → accounts |
| `name` | text | No | — | Nome |
| `contact_type` | text | No | — | inquilino, ex_inquilino, lead, fiador, proprietário |
| `email` | text | Yes | — | Email |
| `phone` | text | Yes | — | Telefone |
| `document` | text | Yes | — | CPF/CNPJ |
| `address` | text | Yes | — | Endereço |
| `company` | text | Yes | — | Empresa |
| `notes` | text | Yes | — | Observações |
| `lead_score` | integer | Yes | `0` | Score do lead |
| `status` | text | Yes | `'active'` | Status |
| `created_at` | timestamptz | Yes | `now()` | — |
| `updated_at` | timestamptz | Yes | `now()` | — |

---

#### `scheduled_visits`
> Visitas agendadas aos imóveis.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | Criador |
| `account_id` | uuid | Yes | — | FK → accounts |
| `property_id` | uuid | Yes | — | FK → properties |
| `contact_id` | uuid | Yes | — | FK → contacts |
| `visitor_name` | text | No | — | Nome do visitante |
| `visitor_phone` | text | No | — | Telefone |
| `visitor_email` | text | Yes | — | Email |
| `visit_date` | date | No | — | Data da visita |
| `visit_time` | time | No | — | Horário |
| `status` | text | No | `'scheduled'` | scheduled, completed, cancelled |
| `notes` | text | Yes | — | Observações |
| `created_by` | text | Yes | `'agent'` | Quem criou |
| `created_at` | timestamptz | No | `now()` | — |
| `updated_at` | timestamptz | No | `now()` | — |

---

#### `portal_integrations`
> Configuração de portais imobiliários por conta.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `account_id` | uuid | No | — | FK → accounts |
| `provider` | text | No | — | `grupozap`, `vivareal`, `olx` |
| `is_active` | boolean | Yes | `true` | Portal ativo |
| `ad_limit` | integer | Yes | `0` | Limite de anúncios |
| `featured_limit` | integer | Yes | `0` | Limite de destaques |
| `credentials` | jsonb | Yes | `'{}'` | Credenciais |
| `feed_url` | text | Yes | — | URL do feed |
| `created_at` | timestamptz | Yes | `now()` | — |
| `updated_at` | timestamptz | Yes | `now()` | — |

---

#### `billing_plans`, `checkout_sessions`, `payments`, `license_audit`
> Tabelas do módulo de billing/licenciamento.

*(Consultar seção 3.2 da versão anterior ou types.ts para schema completo)*

---

## 4. Funções do Banco de Dados

| Função | Tipo | Descrição |
|--------|------|-----------|
| `has_role(user_id, role)` | SECURITY DEFINER | Verifica se usuário tem determinada role |
| `is_super_admin(user_id)` | SECURITY DEFINER | Verifica se é super admin |
| `get_user_account_id(user_id)` | SECURITY DEFINER | Retorna account_id do usuário |
| `get_resumo_financeiro(user_id, data_inicio, data_fim)` | SECURITY DEFINER | Retorna resumo financeiro (receitas, despesas, saldo, inadimplência) |
| `handle_new_user()` | TRIGGER | Cria account + profile + role ao registrar usuário |
| `update_lancamento_status()` | TRIGGER | Auto-atualiza status de lançamentos financeiros |
| `update_invoice_status()` | TRIGGER | Auto-atualiza status de faturas |
| `sync_invoice_to_lancamento()` | TRIGGER | Sincroniza invoice ↔ lançamento |
| `update_updated_at_column()` | TRIGGER | Atualiza `updated_at` automaticamente |
| `clean_old_messages()` | TRIGGER | Mantém apenas 10 últimas mensagens por conversa |

---

## 5. Enums

| Enum | Valores |
|------|---------|
| `app_role` | admin, sdr, suporte, full, agenda, cadastro_leads, financeiro, super_admin, trial |
| `lancamento_status` | pendente, pago, atrasado, cancelado |
| `lancamento_tipo` | receita, despesa |

---

## 6. Storage (Buckets)

| Bucket | Público | Descrição |
|--------|---------|-----------|
| `property-photos` | ✅ Sim | Fotos dos imóveis |
| `property-documents` | ❌ Não | Documentos dos imóveis |
| `contract-documents` | ❌ Não | Documentos/PDFs dos contratos |

---

## 7. Edge Functions

| Função | JWT | Descrição |
|--------|-----|-----------|
| `admin-create-user` | ✅ | Cria usuário (admin) |
| `admin-update-user` | ✅ | Atualiza usuário (nome, role, senha) |
| `admin-delete-user` | ✅ | Remove usuário |
| `admin-list-users` | ✅ | Lista usuários do auth |
| `admin-stats` | ✅ | Estatísticas do admin |
| `admin-update-license` | ✅ | Atualiza licença manualmente |
| `license-verify` | ✅ | Verifica validade da licença/trial |
| `checkout-session` | ✅ | Cria sessão de checkout |
| `check-payment-status` | ✅ | Verifica status do pagamento |
| `generate-invoices` | ✅ | Gera faturas dos contratos ativos |
| `generate-lancamentos-contrato` | ✅ | Gera lançamentos financeiros por contrato |
| `financial-dashboard` | ✅ | Dados do dashboard financeiro |
| `invoice-reminders` | ❌ | Lembretes de faturas vencidas (cron/scheduled) |
| `generate-portal-feed` | ❌ | Feed XML VrSync para portais imobiliários |
| `payment-webhook` | ❌ | Webhook genérico de pagamento |
| `cakto-webhook` | ❌ | Webhook da Cakto (provedor de pagamento) |

---

## 8. Secrets (Variáveis de Ambiente)

| Secret | Descrição |
|--------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin) |
| `SUPABASE_DB_URL` | URL de conexão direta ao banco |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública |
| `CAL_COM_API_KEY` | API key Cal.com |
| `N8N_POSTGRES_*` | Credenciais para integração N8N |
| `N8N_WEBHOOK_URL` | URL webhook N8N |
| `AI_GATEWAY_API_KEY` | API key do provedor de IA |
| `AI_GATEWAY_URL` | Endpoint de chat/completions do provedor de IA |

---

## 9. Padrão RLS (Row Level Security)

Todas as tabelas de dados do tenant seguem o padrão:

```sql
-- SELECT: Membros da conta podem ver dados da conta
CREATE POLICY "Account members can view ..."
ON public.<table> FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

-- INSERT: Membros da conta + user_id = auth.uid()
CREATE POLICY "Account members can insert ..."
ON public.<table> FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid()) 
  AND auth.uid() = user_id
);

-- UPDATE: Membros da conta
CREATE POLICY "Account members can update ..."
ON public.<table> FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

-- DELETE: Membros da conta
CREATE POLICY "Account members can delete ..."
ON public.<table> FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));
```

---

## 10. Módulos Funcionais

### 10.1 Dashboard (`/`)
- Cards com estatísticas: imóveis, cobranças, contratos
- Calculadoras (inflação, juros, financiamento)
- Resumo de imóveis (donut chart)
- Tabela de faturas recentes com tabs

### 10.2 Imóveis (`/imoveis`)
- CRUD completo com cards visuais
- Upload de fotos e documentos
- Pessoas vinculadas (proprietário, síndico, zelador)
- Integração com portais (ZAP, Viva Real, OLX)
- Importação massiva via CSV

### 10.3 Contratos (`/contratos`)
- Wizard de criação vinculado ao imóvel
- Co-inquilinos e cobranças extras (JSON)
- Importação de PDFs com extração automática:
  - Nº do contrato (do nome do arquivo)
  - Nome do inquilino (do texto do PDF)
  - Unidade do imóvel (Cláusula Primeira)
  - Datas de vigência (Cláusula Terceira)
  - Status automático (ativo/vencido)
  - Matching inteligente com imóveis existentes

### 10.4 Faturas (`/faturas`)
- Geração automática via Edge Function `generate-invoices`
- Composição detalhada (aluguel + utilities + extras)
- Status: pending → paid/overdue → cancelled
- Lembretes automáticos via `invoice-reminders`

### 10.5 Financeiro (`/financeiro`)
- Dashboard com receitas, despesas, saldo, inadimplência
- Lançamentos vinculados a contratos e faturas
- Conciliação/baixa de pagamentos (`/financeiro/baixa`)
- Importação massiva via XLSX (`/configuracoes/importar-conciliacao`)
- Sincronização automática: fatura ↔ lançamento via trigger

### 10.6 Contatos (`/contatos`)
- Tipos: inquilino, ex_inquilino, lead, fiador, proprietário
- Importação massiva via CSV
- Detalhes com link WhatsApp e contratos vinculados
- Busca por CPF/CNPJ e email

### 10.7 Visitas (`/visitas`)
- Agendamento de visitas aos imóveis
- Vinculação com contatos e propriedades
- Status: scheduled, completed, cancelled

### 10.8 Vistorias (`/vistorias`)
- Wizard de 5 etapas: Contrato → Checklist → Evidências → Assinatura → Sumário
- Interface mobile-first (thumb-zone)
- Captura de fotos com compressão automática (max 1MB)
- Assinatura digital em tela
- Persistência offline via localStorage
- Monitoramento de conectividade em tempo real

### 10.9 Usuários (`/usuarios`)
- CRUD de funcionários via Edge Functions
- Atribuição de roles (admin, full, agenda, etc)
- Ativação/desativação de contas
- Redefinição de senha

### 10.10 Portais Imobiliários (`/configuracoes/portais`)
- Feed XML VrSync (padrão Grupo ZAP)
- Ativação por portal: ZAP, Viva Real, OLX
- Publicação seletiva de imóveis
- URL: `https://{supabase_url}/functions/v1/generate-portal-feed?account_id={ID}`

---

## 11. Fluxo de Pagamento / Licenciamento

1. Usuário escolhe plano em `/plans`
2. Sistema cria `checkout_session`
3. Redireciona para provedor (Cakto)
4. Webhook (`cakto-webhook`) recebe confirmação
5. Registra em `payments` e `license_audit`
6. Atualiza `data_expiracao` em `accounts` e `profiles`
7. `LicenseProvider` verifica expiração via `license-verify`
8. **Fail-safe:** Em caso de erro na verificação, assume licença válida

---

## 12. Dependências Principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| React | 18.3 | UI |
| Vite | — | Build |
| TypeScript | — | Tipagem |
| Tailwind CSS | — | Estilos |
| shadcn/ui | — | Componentes base |
| @supabase/supabase-js | 2.76 | Backend |
| @tanstack/react-query | 5.83 | Cache/fetching |
| react-router-dom | 6.30 | Roteamento |
| recharts | 2.15 | Gráficos |
| date-fns | 3.6 | Manipulação de datas |
| sonner | 1.7 | Toasts (notificações) |
| zod | 3.25 | Validação de schemas |
| react-hook-form | 7.61 | Formulários |
| lucide-react | 0.462 | Ícones |
| pdfjs-dist | 4.4 | Extração de texto PDF |
| xlsx | 0.18 | Leitura de planilhas |
| browser-image-compression | 2.0 | Compressão de fotos |

---

## 13. Análise de Pontos Fortes ✅

### Arquitetura
- **Multi-tenancy robusto** via RLS + `account_id` em todas as tabelas
- **Isolamento de roles** em tabela separada (previne escalação de privilégios)
- **Funções SECURITY DEFINER** para operações de autorização (evita recursão RLS)
- **Fail-safe no licenciamento** — nunca bloqueia acesso por falha transitória

### Funcionalidades
- **Importação inteligente de PDFs** com extração de dados via pdfjs-dist
- **Matching de imóveis** com regex dinâmica para discrepâncias de formatação
- **Sincronização bidirecional** faturas ↔ lançamentos financeiros via triggers
- **Módulo de vistorias offline-first** com persistência e recuperação automática
- **Feed XML VrSync** para integração nativa com portais imobiliários
- **Dashboard financeiro** com função SQL otimizada (`get_resumo_financeiro`)

### UX/UI
- **Design responsivo** com componentes mobile-first
- **Importação massiva** com preview, progresso e validação antes da confirmação
- **Trial banner** não-intrusivo com informação contextual

---

## 14. Áreas que Requerem Atenção ⚠️

### Segurança
1. **Webhooks sem autenticação** — `payment-webhook` e `cakto-webhook` não verificam JWT. Devem validar assinatura do provedor (HMAC/signature header)
2. **Roles na criação de usuário** — O formulário de criação (`admin-create-user`) não envia role; novos funcionários ficam sem role explícita no DB

### Arquitetura
3. **Consultas por `user_id` vs `account_id`** — Algumas queries (ContractsList, PropertiesList) filtram por `user_id` ao invés de `account_id`, o que impede que outros membros da conta vejam os dados
4. **Ausência de paginação server-side** — Listas usam paginação client-side, limitadas pelo max 1000 rows do Supabase
5. **`property_id` nullable em contracts** — Permite contratos sem imóvel, mas pode causar NullPointerException em views que assumem imóvel

### Frontend
6. **Arquivo `ImportContractDocsDialog.tsx`** com 568 linhas — Deve ser refatorado em subcomponentes (parser, matcher, uploader)
7. **`PropertyDetails.tsx`** com 1232 linhas — Monólito que concentra muitas responsabilidades
8. **Duplicação de `getStatusBadge`** — Função repetida em 6+ páginas sem centralização
9. **Ausência de Error Boundary** — Erros de renderização causam tela branca sem feedback

### Performance
10. **`useDashboardStats` faz 4 queries sequenciais** — Poderia ser consolidado em uma função SQL ou Edge Function
11. **`useAccountId` busca account_id em cada página** — Deveria ser cacheado no AuthContext
12. **Sem lazy loading de rotas** — Todas as páginas são importadas no bundle principal

### Dados
13. **Valor do aluguel zerado na importação PDF** — `rental_value: 0` quando deveria extrair da Cláusula Quinta
14. **Trigger `sync_invoice_to_lancamento`** só sincroniza status — Deveria sincronizar também valor e datas
15. **Ausência de soft-delete** — Exclusão é permanente em todas as tabelas

---

## 15. Guia de Migração para Outro Banco

### 15.1 O que replicar obrigatoriamente

1. **Tabelas e colunas** — conforme seção 3.2
2. **Enums** — `app_role`, `lancamento_status`, `lancamento_tipo`
3. **Funções SQL**:
   - `has_role(user_id, role)` — verificação de role sem recursão
   - `is_super_admin(user_id)` — verificação de super admin
   - `get_user_account_id(user_id)` — resolução de tenant
   - `get_resumo_financeiro(user_id, inicio, fim)` — agregação financeira
4. **Triggers**:
   - `handle_new_user` — onboarding automático (account + profile + role)
   - `update_lancamento_status` — auto-status de lançamentos
   - `update_invoice_status` — auto-status de faturas
   - `sync_invoice_to_lancamento` — sincronização faturas ↔ lançamentos
5. **Autorização** — implementar equivalente ao RLS no middleware

### 15.2 Dependências do Supabase

| Componente | Função | Criticidade |
|------------|--------|-------------|
| Supabase Auth | Autenticação (email/password) | 🔴 Alta |
| RLS Policies | Isolamento multi-tenant | 🔴 Alta |
| Edge Functions | 16 funções serverless (Deno) | 🔴 Alta |
| Storage Buckets | Fotos e documentos | 🟡 Média |
| Realtime | Não utilizado | ⚪ Nenhuma |

### 15.3 Substituições necessárias

| Supabase | Alternativa | Complexidade |
|----------|-------------|--------------|
| Supabase Auth | Firebase Auth, Auth0, Clerk, Keycloak | Média |
| RLS Policies | Middleware (CASL, Casbin) + interceptors | Alta |
| Edge Functions | AWS Lambda, Cloudflare Workers, Vercel Functions | Média |
| Storage Buckets | AWS S3, Cloudflare R2, MinIO | Baixa |
| `supabase-js` client | Axios/fetch + ORM (Prisma, Drizzle, Knex) | Alta |
| Realtime subscriptions | WebSocket/Socket.io (se necessário) | N/A |

### 15.4 Passos de Migração

```bash
# 1. Exportar schema
pg_dump -h db.yvlzmbamsqzqqbhdrqwk.supabase.co -U postgres -d postgres \
  --schema=public --schema-only -f schema.sql

# 2. Exportar dados
pg_dump -h db.yvlzmbamsqzqqbhdrqwk.supabase.co -U postgres -d postgres \
  --schema=public --data-only --format=custom -f data.dump

# 3. Exportar storage
# Use supabase CLI ou API para download dos arquivos

# 4. Recriar funções e triggers (ver seção 4)
# 5. Implementar middleware de autorização
# 6. Migrar Edge Functions para Lambda/Workers
# 7. Atualizar client SDK para novo backend
```

### 15.5 Adaptação do Frontend

O frontend é **100% React** (sem SSR/Next.js), portanto pode ser hospedado em qualquer provedor estático (Vercel, Netlify, Cloudflare Pages).

Arquivos a modificar:
- `src/integrations/supabase/client.ts` → Substituir por novo SDK
- `src/hooks/useAuth.tsx` → Adaptar para novo provedor de auth
- `src/hooks/useAccountId.tsx` → Adaptar resolução de tenant
- `src/contexts/LicenseContext.tsx` → Adaptar verificação de licença
- Todas as chamadas `supabase.from(...)` → Substituir por novo ORM/API client
- Todas as chamadas `supabase.functions.invoke(...)` → Substituir por fetch/axios
- Todas as chamadas `supabase.storage.from(...)` → Substituir por novo storage SDK

---

## 16. Fluxos de Dados Críticos

### 16.1 Fluxo de Criação de Contrato
```
Usuário → ContractWizard → INSERT contracts → 
  (manual) generate-invoices → INSERT invoices → 
  (trigger) sync_invoice_to_lancamento → INSERT lancamentos_financeiros
```

### 16.2 Fluxo de Pagamento de Fatura
```
Usuário → BaixaPagamentos → UPDATE invoices.payment_date →
  (trigger) update_invoice_status → SET status='paid' →
  (trigger) sync_invoice_to_lancamento → UPDATE lancamentos.status='pago'
```

### 16.3 Fluxo de Onboarding
```
Registro → auth.users INSERT →
  (trigger) handle_new_user → 
    INSERT accounts (trial, 14 dias) →
    INSERT profiles (vinculado ao account) →
    INSERT user_roles ('trial' ou 'super_admin')
```

### 16.4 Fluxo de Licenciamento
```
Trial expira → LicenseProvider detecta →
  canEdit = false → TrialBanner "Modo Somente Leitura" →
  Usuário compra plano → cakto-webhook →
    INSERT payments → UPDATE accounts.data_expiracao →
    LicenseProvider revalida → canEdit = true
```

---

*Documentação gerada a partir do código-fonte, schema do banco de dados e análise do sistema em Março/2026.*
