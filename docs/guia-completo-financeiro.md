# 💰 Guia Completo do Módulo Financeiro

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Modelo de Dados](#modelo-de-dados)
3. [Automação de Receitas](#automação-de-receitas)
4. [CRUD de Lançamentos](#crud-de-lançamentos)
5. [Baixa de Pagamentos](#baixa-de-pagamentos)
6. [Dashboard e Gráficos](#dashboard-e-gráficos)
7. [APIs e Endpoints](#apis-e-endpoints)

---

## 🎯 Visão Geral

Sistema completo de gestão financeira imobiliária com:

✅ **Geração Automática** de receitas de aluguel  
✅ **CRUD Completo** para lançamentos manuais  
✅ **Conciliação** e baixa de pagamentos  
✅ **Dashboard Visual** com KPIs e gráficos  
✅ **Relatórios** de fluxo de caixa, despesas e inadimplência  

---

## 🗄️ Modelo de Dados

### Tabela: `lancamentos_financeiros`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `user_id` | UUID | Referência ao usuário |
| `id_imovel` | UUID | FK para `properties` |
| `id_contrato` | UUID | FK para `contracts` (nullable) |
| `tipo` | ENUM | `'receita'` ou `'despesa'` |
| `categoria` | TEXT | Ex: Aluguel, IPTU, Manutenção |
| `descricao` | TEXT | Descrição do lançamento |
| `valor` | DECIMAL | Valor monetário |
| `data_vencimento` | DATE | Data de vencimento |
| `data_pagamento` | DATE | Data efetiva do pagamento (nullable) |
| `status` | ENUM | `'pendente'`, `'pago'`, `'atrasado'`, `'cancelado'` |

### Lógica Automática de Status

O sistema possui um **trigger** que atualiza o status automaticamente:

- **Pago**: Quando `data_pagamento` é preenchido
- **Atrasado**: Quando `data_vencimento < hoje` e não tem `data_pagamento`

---

## 🤖 Automação de Receitas

### Edge Function: `generate-lancamentos-contrato`

Gera automaticamente os lançamentos de aluguel ao criar/renovar um contrato.

**Como Funcionar:**

```typescript
// Ao criar um contrato no frontend
const { data, error } = await supabase.functions.invoke('generate-lancamentos-contrato', {
  body: { contract_id: 'uuid-do-contrato' }
});
```

**O que a função faz:**
1. Busca dados do contrato (valor, dia de vencimento, período)
2. Calcula o número de meses da vigência
3. Cria um lançamento de receita para cada mês
4. **Evita duplicatas** (verifica se já existe lançamento para aquela data)

**Exemplo de Lançamento Gerado:**
```json
{
  "tipo": "receita",
  "categoria": "Aluguel",
  "descricao": "Aluguel referente a janeiro de 2024",
  "valor": 1500.00,
  "data_vencimento": "2024-01-05",
  "status": "pendente"
}
```

### Integração com Wizard de Contratos

Adicione a chamada após salvar o contrato:

```typescript
// Em ContractWizard.tsx
const handleSave = async (contractData) => {
  // 1. Criar contrato
  const { data: contract } = await supabase
    .from('contracts')
    .insert(contractData)
    .select()
    .single();

  // 2. Gerar lançamentos automaticamente
  await supabase.functions.invoke('generate-lancamentos-contrato', {
    body: { contract_id: contract.id }
  });
  
  toast.success('Contrato criado e lançamentos gerados!');
};
```

---

## 📝 CRUD de Lançamentos

### Componente: `LancamentoForm`

Formulário completo para criar/editar lançamentos manualmente.

**Campos do Formulário:**
- Tipo (Receita/Despesa)
- Categoria (dropdown dinâmico baseado no tipo)
- Descrição
- Valor
- Data de Vencimento
- Imóvel (opcional)
- Contrato (opcional, apenas para receitas)

**Uso:**

```typescript
import { LancamentoForm } from "@/components/Financial/LancamentoForm";

function MeuComponente() {
  const [formOpen, setFormOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setFormOpen(true)}>
        Novo Lançamento
      </Button>
      
      <LancamentoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          // Atualizar lista, mostrar toast, etc.
          refetch();
        }}
      />
    </>
  );
}
```

**Categorias Pré-Definidas:**

```typescript
const categorias = {
  receita: ['Aluguel', 'Condomínio', 'Multa', 'Outros'],
  despesa: ['Manutenção', 'IPTU', 'Condomínio', 'Água', 'Luz', 'Gás', 'Comissão', 'Outros'],
};
```

---

## ✅ Baixa de Pagamentos

### Página: `/financeiro/baixa`

Interface de conciliação para marcar lançamentos como pagos.

**Funcionalidades:**
- ✅ Lista **Atrasados** (vermelho) e **Pendentes** (amarelo)
- ✅ Cards com resumo (quantidade e total atrasado)
- ✅ Baixa individual com seleção de data de pagamento
- ✅ Atualização automática do status para `'pago'`

**Fluxo de Uso:**
1. Usuário visualiza a tabela de pendentes/atrasados
2. Clica em "Baixar" no lançamento desejado
3. Confirma a data de pagamento
4. Sistema atualiza o lançamento e recalcula os KPIs

**Código de Baixa:**

```typescript
const handleBaixarPagamento = async (lancamentoId, dataPagamento) => {
  const { error } = await supabase
    .from('lancamentos_financeiros')
    .update({
      status: 'pago',
      data_pagamento: dataPagamento,
    })
    .eq('id', lancamentoId);
  
  if (!error) {
    toast.success('Pagamento baixado com sucesso!');
    refetch();
  }
};
```

---

## 📊 Dashboard e Gráficos

### Página: `/financeiro`

Dashboard completo com visualizações avançadas.

### 1. **KPIs (Cards de Resumo)**

Quatro métricas principais:

- 🟢 **Total Receitas**: Soma de receitas pagas no período
- 🔴 **Total Despesas**: Soma de despesas pagas no período
- 🔵 **Saldo**: Receitas - Despesas (pode ser negativo)
- 🟡 **Inadimplência**: Soma de todos os atrasados (sem filtro de data)

### 2. **Gráfico de Fluxo de Caixa** (Barras)

Mostra receitas vs despesas dos últimos 6 meses.

```typescript
const { data: fluxoCaixa } = useFluxoCaixa({ 
  meses: 6, 
  id_imovel: 'opcional' 
});

// Retorno esperado:
[
  { mes: "2024-01", receitas: 5000, despesas: 3000, saldo: 2000 },
  { mes: "2024-02", receitas: 4500, despesas: 3500, saldo: 1000 },
  ...
]
```

### 3. **Gráfico de Composição de Despesas** (Pizza)

Distribuição das despesas por categoria.

```typescript
const { data: composicao } = useComposicaoDespesas({
  data_inicio: '2024-01-01',
  data_fim: '2024-01-31',
  id_imovel: 'opcional'
});

// Retorno esperado:
[
  { categoria: "Manutenção", valor: 800 },
  { categoria: "IPTU", valor: 500 },
  { categoria: "Comissão", valor: 300 },
  ...
]
```

### 4. **Gráfico de Inadimplência por Imóvel** (Barras Horizontais)

Valores atrasados agrupados por propriedade.

```typescript
const { data: inadimplencia } = useInadimplenciaPorImovel();

// Retorno esperado:
[
  { id_imovel: "uuid", nome_imovel: "Apt 101", total_inadimplencia: 1500 },
  { id_imovel: "uuid", nome_imovel: "Casa Centro", total_inadimplencia: 800 },
  ...
]
```

### Filtros Disponíveis

- **Período Rápido**: Mês Atual, Mês Anterior, Ano Atual
- **Período Customizado**: Data início + Data fim
- **Por Imóvel**: Dropdown com todos os imóveis (ou "Todos")

---

## 🔌 APIs e Endpoints

### Edge Function: `financial-dashboard`

Endpoint único com múltiplas ações.

**Formato da Requisição:**

```typescript
const { data, error } = await supabase.functions.invoke('financial-dashboard', {
  body: {
    action: 'fluxo_caixa', // ou 'composicao_despesas' ou 'inadimplencia_por_imovel'
    user_id: 'uuid-do-usuario',
    // Parâmetros específicos da action
    meses: 6,
    id_imovel: 'uuid' // opcional
  }
});
```

### Actions Disponíveis

#### 1. **fluxo_caixa**

Parâmetros:
- `meses`: Número de meses retroativos (padrão: 6)
- `id_imovel`: UUID do imóvel (opcional)

Retorno: Array de objetos `{ mes, receitas, despesas, saldo }`

#### 2. **composicao_despesas**

Parâmetros:
- `data_inicio`: Data inicial (YYYY-MM-DD)
- `data_fim`: Data final (YYYY-MM-DD)
- `id_imovel`: UUID do imóvel (opcional)

Retorno: Array de objetos `{ categoria, valor }`

#### 3. **inadimplencia_por_imovel**

Parâmetros: Nenhum (usa apenas `user_id`)

Retorno: Array de objetos `{ id_imovel, nome_imovel, total_inadimplencia }`

---

## 🚀 Guia de Implementação Passo a Passo

### Etapa 1: Criar Tabela ✅ (Já feito)
```sql
-- Tabela já criada via migration
```

### Etapa 2: Gerar Lançamentos ao Criar Contrato

Em `ContractWizard.tsx`, após salvar:

```typescript
// Adicionar após criação bem-sucedida do contrato
await supabase.functions.invoke('generate-lancamentos-contrato', {
  body: { contract_id: newContract.id }
});
```

### Etapa 3: Adicionar Despesas Manualmente

Usar o botão "Novo Lançamento" no dashboard:

```typescript
<Button onClick={() => setFormOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Novo Lançamento
</Button>
```

### Etapa 4: Baixar Pagamentos

Ir para `/financeiro/baixa` e clicar em "Baixar" nos lançamentos.

### Etapa 5: Visualizar Dashboard

Acessar `/financeiro` para ver todos os gráficos e KPIs.

---

## 📖 Exemplos de Uso Completos

### Exemplo 1: Criar Contrato e Gerar Aluguéis

```typescript
async function criarContratoCompleto() {
  // 1. Criar contrato
  const { data: contract } = await supabase
    .from('contracts')
    .insert({
      property_id: 'uuid',
      tenant_name: 'João Silva',
      rental_value: 1500,
      payment_day: 5,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'active'
    })
    .select()
    .single();

  // 2. Gerar 12 lançamentos automáticos
  await supabase.functions.invoke('generate-lancamentos-contrato', {
    body: { contract_id: contract.id }
  });

  console.log('Contrato criado com 12 lançamentos de aluguel!');
}
```

### Exemplo 2: Adicionar Despesa de Manutenção

```typescript
async function adicionarDespesa() {
  await supabase
    .from('lancamentos_financeiros')
    .insert({
      tipo: 'despesa',
      categoria: 'Manutenção',
      descricao: 'Reparo hidráulico apartamento 101',
      valor: 350.00,
      data_vencimento: '2024-02-10',
      id_imovel: 'uuid-do-imovel',
      status: 'pendente'
    });
}
```

### Exemplo 3: Baixar Múltiplos Pagamentos

```typescript
async function baixarPagamentosEmLote(lancamentoIds: string[]) {
  const dataPagamento = new Date().toISOString().split('T')[0];
  
  for (const id of lancamentoIds) {
    await supabase
      .from('lancamentos_financeiros')
      .update({ 
        status: 'pago', 
        data_pagamento: dataPagamento 
      })
      .eq('id', id);
  }
  
  toast.success(`${lancamentoIds.length} pagamentos baixados!`);
}
```

---

## 🔧 Manutenção e Troubleshooting

### Problema: Lançamentos Duplicados

**Solução**: A função `generate-lancamentos-contrato` já verifica duplicatas.

```sql
-- Verificar duplicatas manualmente
SELECT data_vencimento, COUNT(*) 
FROM lancamentos_financeiros 
WHERE id_contrato = 'uuid'
GROUP BY data_vencimento 
HAVING COUNT(*) > 1;
```

### Problema: Status não Atualiza

**Solução**: Verificar se o trigger está ativo.

```sql
-- Verificar trigger
SELECT * FROM pg_trigger WHERE tgname = 'check_lancamento_status';
```

### Problema: Gráficos Não Carregam

**Solução**: Verificar logs da edge function.

```typescript
// Adicionar logs no frontend
console.log('Parâmetros:', { data_inicio, data_fim, id_imovel });
```

---

## 📚 Referências

- [Documentação Supabase RPC](https://supabase.com/docs/guides/database/functions)
- [Recharts Documentation](https://recharts.org/)
- [React Query Hooks](https://tanstack.com/query/latest)

---

## ✨ Próximas Melhorias

- [ ] Exportação de relatórios em PDF/Excel
- [ ] Importação de extratos bancários
- [ ] Conciliação automática com dados bancários
- [ ] Previsão de fluxo de caixa (6 meses futuros)
- [ ] Alertas de inadimplência via email/WhatsApp
- [ ] Integração com sistemas de pagamento (PIX, boleto)
- [ ] Categorização automática via IA
- [ ] Dashboard mobile responsivo

---

**Documentação criada em:** Janeiro 2024  
**Versão:** 1.0.0  
**Autor:** Sistema Accordous