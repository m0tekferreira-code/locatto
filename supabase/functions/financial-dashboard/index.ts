import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, user_id, ...params } = await req.json();

    if (!user_id) {
      throw new Error('user_id é obrigatório');
    }

    let result;

    switch (action) {
      case 'fluxo_caixa':
        result = await getFluxoCaixa(supabase, user_id, params);
        break;
      
      case 'composicao_despesas':
        result = await getComposicaoDespesas(supabase, user_id, params);
        break;
      
      case 'inadimplencia_por_imovel':
        result = await getInadimplenciaPorImovel(supabase, user_id);
        break;
      
      default:
        throw new Error('Action inválida');
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Fluxo de caixa: Receitas vs Despesas por mês
async function getFluxoCaixa(supabase: any, user_id: string, params: any) {
  const { meses = 6, id_imovel } = params;
  
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - meses);

  let query = supabase
    .from('lancamentos_financeiros')
    .select('tipo, valor, data_pagamento, data_vencimento')
    .eq('user_id', user_id)
    .eq('status', 'pago')
    .gte('data_pagamento', startDate.toISOString().split('T')[0])
    .lte('data_pagamento', today.toISOString().split('T')[0]);

  if (id_imovel) {
    query = query.eq('id_imovel', id_imovel);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Agrupar por mês
  const grouped: { [key: string]: { receitas: number; despesas: number } } = {};

  data.forEach((item: any) => {
    const date = new Date(item.data_pagamento);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped[monthKey]) {
      grouped[monthKey] = { receitas: 0, despesas: 0 };
    }

    if (item.tipo === 'receita') {
      grouped[monthKey].receitas += Number(item.valor);
    } else {
      grouped[monthKey].despesas += Number(item.valor);
    }
  });

  // Converter para array ordenado
  const result = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valores]) => ({
      mes,
      ...valores,
      saldo: valores.receitas - valores.despesas,
    }));

  return result;
}

// Composição de despesas por categoria
async function getComposicaoDespesas(supabase: any, user_id: string, params: any) {
  const { data_inicio, data_fim, id_imovel } = params;

  let query = supabase
    .from('lancamentos_financeiros')
    .select('categoria, valor')
    .eq('user_id', user_id)
    .eq('tipo', 'despesa')
    .eq('status', 'pago');

  if (data_inicio) {
    query = query.gte('data_pagamento', data_inicio);
  }
  if (data_fim) {
    query = query.lte('data_pagamento', data_fim);
  }
  if (id_imovel) {
    query = query.eq('id_imovel', id_imovel);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Agrupar por categoria
  const grouped: { [key: string]: number } = {};

  data.forEach((item: any) => {
    const categoria = item.categoria || 'Outros';
    grouped[categoria] = (grouped[categoria] || 0) + Number(item.valor);
  });

  // Converter para array
  const result = Object.entries(grouped).map(([categoria, valor]) => ({
    categoria,
    valor,
  }));

  return result;
}

// Inadimplência por imóvel
async function getInadimplenciaPorImovel(supabase: any, user_id: string) {
  const { data, error } = await supabase
    .from('lancamentos_financeiros')
    .select('id_imovel, valor, properties(name)')
    .eq('user_id', user_id)
    .eq('status', 'atrasado');

  if (error) throw error;

  // Agrupar por imóvel
  const grouped: { [key: string]: { nome: string; total: number } } = {};

  data.forEach((item: any) => {
    const imovelId = item.id_imovel;
    if (!grouped[imovelId]) {
      grouped[imovelId] = {
        nome: item.properties?.name || 'Imóvel sem nome',
        total: 0,
      };
    }
    grouped[imovelId].total += Number(item.valor);
  });

  // Converter para array ordenado por valor
  const result = Object.entries(grouped)
    .map(([id, data]) => ({
      id_imovel: id,
      nome_imovel: data.nome,
      total_inadimplencia: data.total,
    }))
    .sort((a, b) => b.total_inadimplencia - a.total_inadimplencia);

  return result;
}