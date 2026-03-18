# Módulo Financeiro - Lançamentos e Resumo

## 📋 Visão Geral

Sistema completo de gestão financeira com lançamentos de receitas e despesas, controle de inadimplência e cálculo automático de resumos financeiros.

## 🗄️ Estrutura do Banco de Dados

### Tabela: `lancamentos_financeiros`

```sql
CREATE TABLE public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  id_imovel UUID REFERENCES public.properties(id),
  id_contrato UUID REFERENCES public.contracts(id),
  tipo lancamento_tipo NOT NULL, -- 'receita' ou 'despesa'
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
```

### ENUMs

- **lancamento_tipo**: `'receita'` | `'despesa'`
- **lancamento_status**: `'pendente'` | `'pago'` | `'atrasado'` | `'cancelado'`

## 🔄 Lógica Automática

### Status Automático

A tabela possui um trigger que atualiza automaticamente o status:

- ✅ Se `data_pagamento` for preenchido e status for `'pendente'` → muda para `'pago'`
- ⚠️ Se `data_pagamento` for NULL, status for `'pendente'` e `data_vencimento < hoje` → muda para `'atrasado'`

## 📊 Função `getResumoFinanceiro`

### Assinatura TypeScript

```typescript
async function getResumoFinanceiro(
  data_inicio: Date,
  data_fim: Date
): Promise<ResumoFinanceiro>

interface ResumoFinanceiro {
  total_receitas: number;      // Soma de receitas pagas no período
  total_despesas: number;       // Soma de despesas pagas no período
  saldo: number;                // total_receitas - total_despesas
  total_inadimplencia: number;  // Soma de todos os atrasados (sem filtro de data)
}
```

### Lógica de Cálculo

#### 1. **Total Receitas**
```sql
SUM(valor) WHERE:
  - tipo = 'receita'
  - status = 'pago'
  - data_pagamento BETWEEN data_inicio AND data_fim
```

#### 2. **Total Despesas**
```sql
SUM(valor) WHERE:
  - tipo = 'despesa'
  - status = 'pago'
  - data_pagamento BETWEEN data_inicio AND data_fim
```

#### 3. **Saldo**
```typescript
saldo = total_receitas - total_despesas
```

#### 4. **Total Inadimplência**
```sql
SUM(valor) WHERE:
  - status = 'atrasado'
  - (Sem filtro de data - representa o total atual pendente)
```

## 💻 Exemplos de Uso

### 1. Usando o Hook React (Recomendado para componentes)

```typescript
import { useResumoFinanceiro } from "@/hooks/useResumoFinanceiro";

function MeuComponente() {
  const dataInicio = "2024-01-01";
  const dataFim = "2024-01-31";
  
  const { data: resumo, isLoading, error } = useResumoFinanceiro(dataInicio, dataFim);

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar dados</div>;

  return (
    <div>
      <p>Receitas: R$ {resumo.total_receitas.toFixed(2)}</p>
      <p>Despesas: R$ {resumo.total_despesas.toFixed(2)}</p>
      <p>Saldo: R$ {resumo.saldo.toFixed(2)}</p>
      <p>Inadimplência: R$ {resumo.total_inadimplencia.toFixed(2)}</p>
    </div>
  );
}
```

### 2. Função Standalone (Para uso fora de componentes)

```typescript
import { getResumoFinanceiro } from "@/hooks/useResumoFinanceiro";

async function gerarRelatorioMensal() {
  const dataInicio = new Date('2024-01-01');
  const dataFim = new Date('2024-01-31');
  
  try {
    const resumo = await getResumoFinanceiro(dataInicio, dataFim);
    
    console.log('Resumo Financeiro:');
    console.log(`Receitas: R$ ${resumo.total_receitas.toFixed(2)}`);
    console.log(`Despesas: R$ ${resumo.total_despesas.toFixed(2)}`);
    console.log(`Saldo: R$ ${resumo.saldo.toFixed(2)}`);
    console.log(`Inadimplência: R$ ${resumo.total_inadimplencia.toFixed(2)}`);
    
    return resumo;
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    throw error;
  }
}
```

### 3. Chamada Direta ao Supabase (Edge Functions)

```typescript
import { createClient } from '@supabase/supabase-js';

async function getResumoEdgeFunction(dataInicio: string, dataFim: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.rpc('get_resumo_financeiro', {
    p_user_id: 'uuid-do-usuario',
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  });

  if (error) throw error;
  
  return data[0]; // Retorna primeiro registro
}
```

## 📈 Interface Visual

A aplicação possui uma página completa em `/financeiro` com:

- ✅ Filtros de período (Mês Atual, Mês Anterior, Ano, Personalizado)
- ✅ Cards com métricas visuais
- ✅ Indicadores coloridos (Verde = Receitas, Vermelho = Despesas, Azul = Saldo, Amarelo = Inadimplência)
- ✅ Análise detalhada do período
- ✅ Botões para novo lançamento e exportação

## 🔒 Segurança

### RLS Policies

Todas as consultas respeitam Row Level Security:
- ✅ Usuários só veem seus próprios lançamentos
- ✅ Função `get_resumo_financeiro` é SECURITY DEFINER com `search_path = public`
- ✅ Validação automática de `user_id`

### Proteções Implementadas

1. **Trigger de Status**: Atualização automática com `SET search_path = public`
2. **Índices**: Performance otimizada para queries frequentes
3. **Foreign Keys**: Integridade referencial com properties e contracts

## 🧪 Testando

### Inserir Lançamentos de Teste

```sql
-- Receita paga
INSERT INTO lancamentos_financeiros (
  user_id, id_imovel, tipo, valor, status, 
  data_vencimento, data_pagamento, descricao
) VALUES (
  auth.uid(), 
  'uuid-do-imovel',
  'receita',
  1500.00,
  'pago',
  '2024-01-10',
  '2024-01-08',
  'Aluguel Janeiro 2024'
);

-- Despesa atrasada
INSERT INTO lancamentos_financeiros (
  user_id, tipo, valor, status, 
  data_vencimento, descricao
) VALUES (
  auth.uid(),
  'despesa',
  500.00,
  'atrasado',
  '2024-01-05',
  'Manutenção Hidráulica'
);
```

### Consultar Resumo

```sql
SELECT * FROM get_resumo_financeiro(
  auth.uid(),
  '2024-01-01',
  '2024-01-31'
);
```

## 📱 Próximas Funcionalidades

- [ ] Formulário para criar/editar lançamentos
- [ ] Importação de extratos bancários
- [ ] Categorização automática
- [ ] Gráficos de evolução temporal
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Conciliação bancária
- [ ] Previsão de fluxo de caixa

## 🔗 Links Úteis

- [Página Financeiro](/financeiro)
- [Documentação Supabase RPC](https://supabase.com/docs/guides/database/functions)
- [React Query Hooks](https://tanstack.com/query/latest)
