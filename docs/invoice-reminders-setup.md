# Sistema de Notificações de Faturas

## 📋 Visão Geral

Sistema automático que verifica diariamente faturas vencidas e próximas do vencimento, enviando notificações via Email (Resend) e WhatsApp (Evolution API) através do n8n.

## 🔧 Configuração

### 1. Habilitar Extensões no Supabase

Execute no SQL Editor:

```sql
-- Habilitar pg_cron para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Habilitar pg_net para requisições HTTP
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

### 2. Criar Cron Job

Execute no SQL Editor (substitua os valores):

```sql
SELECT cron.schedule(
  'invoice-reminders-daily',
  '0 9 * * *', -- Executa todo dia às 9h (horário UTC)
  $$
  SELECT
    net.http_post(
        url:='https://yvlzmbamsqzqqbhdrqwk.supabase.co/functions/v1/invoice-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bHptYmFtc3F6cXFiaGRycXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDYyNjMsImV4cCI6MjA3NTMyMjI2M30.TqoptjaKfEx-Uu9EY7uPUo7QEAyqTGsP5-wXwwoZvMA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

### 3. Verificar Cron Jobs Criados

```sql
SELECT * FROM cron.job;
```

### 4. Remover Cron Job (se necessário)

```sql
SELECT cron.unschedule('invoice-reminders-daily');
```

## 📊 Workflow n8n

### Estrutura Recomendada

```
Webhook Trigger
    ↓
Split In Batches (notifications)
    ↓
Switch (type: overdue ou upcoming)
    ├─ overdue
    │   ├─ Send Email (Resend) - Template de fatura vencida
    │   └─ Send WhatsApp (Evolution API) - Mensagem de cobrança
    │
    └─ upcoming
        ├─ Send Email (Resend) - Template de lembrete
        └─ Send WhatsApp (Evolution API) - Mensagem de aviso
```

### Payload Recebido pelo n8n

```json
{
  "notifications": [
    {
      "type": "overdue",
      "invoice": {
        "id": "uuid",
        "number": "FAT-2024-001",
        "dueDate": "2024-01-15",
        "amount": 1500.00,
        "referenceMonth": "2024-01-01",
        "daysOverdue": 5,
        "daysUntilDue": 0
      },
      "property": {
        "id": "uuid",
        "name": "Apartamento Centro",
        "address": "Rua ABC, 123",
        "ownerName": "João Silva",
        "ownerContact": "+5511999999999",
        "ownerEmail": "joao@email.com"
      },
      "recipient": {
        "userId": "uuid",
        "name": "João Silva"
      }
    }
  ],
  "timestamp": "2024-01-20T09:00:00.000Z"
}
```

### Templates de Mensagem

**WhatsApp - Fatura Vencida:**
```
🚨 *FATURA VENCIDA*

Olá {{property.ownerName}}! 

A fatura do imóvel *{{property.name}}* está vencida há {{invoice.daysOverdue}} dias.

💰 Valor: R$ {{invoice.amount}}
📅 Vencimento: {{invoice.dueDate}}
🏠 Imóvel: {{property.address}}

Por favor, regularize o pagamento o quanto antes.
```

**WhatsApp - Vencimento Próximo:**
```
⏰ *LEMBRETE DE VENCIMENTO*

Olá {{property.ownerName}}! 

A fatura do imóvel *{{property.name}}* vence em {{invoice.daysUntilDue}} dias.

💰 Valor: R$ {{invoice.amount}}
📅 Vencimento: {{invoice.dueDate}}
🏠 Imóvel: {{property.address}}

Não esqueça de realizar o pagamento!
```

## 🔍 Lógica de Detecção

- **Faturas Vencidas**: `status = 'pending'` AND `due_date < hoje`
- **Vencimento Próximo**: `status = 'pending'` AND `due_date` entre hoje e 3 dias

## 🧪 Teste Manual

Execute a função manualmente via Supabase Functions:

```bash
curl -X POST https://yvlzmbamsqzqqbhdrqwk.supabase.co/functions/v1/invoice-reminders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

## 📱 Configuração Evolution API no n8n

1. Criar nó HTTP Request
2. Method: POST
3. URL: `{{$env.EVOLUTION_API_URL}}/message/sendText/{{$env.EVOLUTION_INSTANCE}}`
4. Headers:
   - `apikey`: `{{$env.EVOLUTION_API_KEY}}`
5. Body:
```json
{
  "number": "{{$json.property.ownerContact}}",
  "text": "sua mensagem aqui"
}
```

## 📧 Configuração Resend no n8n

1. Instalar app Resend no n8n
2. Configurar credenciais com sua API Key do Resend
3. Criar templates de email profissionais

## ⚙️ Ajustar Horário do Cron

O cron usa horário UTC. Para ajustar:
- `'0 9 * * *'` = 9h UTC (6h Brasília)
- `'0 12 * * *'` = 12h UTC (9h Brasília)
- `'0 15 * * *'` = 15h UTC (12h Brasília)

## 🔐 Secrets Necessários

Já configurados no Supabase:
- ✅ `N8N_WEBHOOK_URL`

Configure no n8n (variáveis de ambiente):
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `RESEND_API_KEY`
