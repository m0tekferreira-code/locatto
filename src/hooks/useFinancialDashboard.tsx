import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FluxoCaixaParams {
  meses?: number;
  id_imovel?: string;
}

interface ComposicaoDespesasParams {
  data_inicio: string;
  data_fim: string;
  id_imovel?: string;
}

export const useFluxoCaixa = (params: FluxoCaixaParams) => {
  return useQuery({
    queryKey: ["fluxo-caixa", params],
    queryFn: async () => {
      const { meses = 6, id_imovel } = params;
      const today = new Date();
      const startDate = new Date(today);
      startDate.setMonth(today.getMonth() - meses);

      let query = supabase
        .from("lancamentos_financeiros")
        .select("tipo, valor, data_pagamento")
        .eq("status", "pago")
        .gte("data_pagamento", startDate.toISOString().split("T")[0])
        .lte("data_pagamento", today.toISOString().split("T")[0]);

      if (id_imovel) query = query.eq("id_imovel", id_imovel);

      const { data, error } = await query;
      if (error) throw error;

      const grouped: Record<string, { receitas: number; despesas: number }> = {};
      (data ?? []).forEach((item) => {
        const d = new Date(item.data_pagamento!);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!grouped[key]) grouped[key] = { receitas: 0, despesas: 0 };
        if (item.tipo === "receita") grouped[key].receitas += Number(item.valor);
        else grouped[key].despesas += Number(item.valor);
      });

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, v]) => ({ mes, ...v, saldo: v.receitas - v.despesas }));
    },
  });
};

export const useComposicaoDespesas = (params: ComposicaoDespesasParams) => {
  return useQuery({
    queryKey: ["composicao-despesas", params],
    queryFn: async () => {
      const { data_inicio, data_fim, id_imovel } = params;

      let query = supabase
        .from("lancamentos_financeiros")
        .select("categoria, valor")
        .eq("tipo", "despesa")
        .eq("status", "pago");

      if (data_inicio) query = query.gte("data_pagamento", data_inicio);
      if (data_fim) query = query.lte("data_pagamento", data_fim);
      if (id_imovel) query = query.eq("id_imovel", id_imovel);

      const { data, error } = await query;
      if (error) throw error;

      const grouped: Record<string, number> = {};
      (data ?? []).forEach((item) => {
        const cat = item.categoria ?? "Outros";
        grouped[cat] = (grouped[cat] ?? 0) + Number(item.valor);
      });

      return Object.entries(grouped).map(([categoria, valor]) => ({ categoria, valor }));
    },
  });
};

export const useInadimplenciaPorImovel = () => {
  return useQuery({
    queryKey: ["inadimplencia-por-imovel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("id_imovel, valor, properties(name)")
        .eq("status", "atrasado");

      if (error) throw error;

      const grouped: Record<string, { nome: string; total: number }> = {};
      (data ?? []).forEach((item: any) => {
        const id = item.id_imovel ?? "sem-imovel";
        if (!grouped[id]) grouped[id] = { nome: item.properties?.name ?? "Imóvel sem nome", total: 0 };
        grouped[id].total += Number(item.valor);
      });

      return Object.entries(grouped)
        .map(([id_imovel, d]) => ({ id_imovel, nome_imovel: d.nome, total_inadimplencia: d.total }))
        .sort((a, b) => b.total_inadimplencia - a.total_inadimplencia);
    },
  });
};