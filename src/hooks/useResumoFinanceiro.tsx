import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResumoFinanceiro {
  total_receitas: number;
  total_despesas: number;
  saldo: number;
  total_inadimplencia: number;
}

/**
 * Hook para obter resumo financeiro do período
 * @param data_inicio Data inicial do período (formato YYYY-MM-DD)
 * @param data_fim Data final do período (formato YYYY-MM-DD)
 */
export const useResumoFinanceiro = (data_inicio: string, data_fim: string) => {
  return useQuery({
    queryKey: ["resumo-financeiro", data_inicio, data_fim],
    queryFn: async (): Promise<ResumoFinanceiro> => {
      const [receitasRes, despesasRes, atrasadosRes] = await Promise.all([
        supabase
          .from("lancamentos_financeiros")
          .select("valor")
          .eq("tipo", "receita")
          .eq("status", "pago")
          .gte("data_pagamento", data_inicio)
          .lte("data_pagamento", data_fim),
        supabase
          .from("lancamentos_financeiros")
          .select("valor")
          .eq("tipo", "despesa")
          .eq("status", "pago")
          .gte("data_pagamento", data_inicio)
          .lte("data_pagamento", data_fim),
        supabase
          .from("lancamentos_financeiros")
          .select("valor")
          .eq("status", "atrasado"),
      ]);

      if (receitasRes.error) throw receitasRes.error;
      if (despesasRes.error) throw despesasRes.error;

      const total_receitas = (receitasRes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
      const total_despesas = (despesasRes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
      const total_inadimplencia = (atrasadosRes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);

      return {
        total_receitas,
        total_despesas,
        saldo: total_receitas - total_despesas,
        total_inadimplencia,
      };
    },
    enabled: !!data_inicio && !!data_fim,
  });
};

export async function getResumoFinanceiro(
  data_inicio: Date,
  data_fim: Date
): Promise<ResumoFinanceiro> {
  const dataInicioStr = data_inicio.toISOString().split('T')[0];
  const dataFimStr = data_fim.toISOString().split('T')[0];

  const [receitasRes, despesasRes, atrasadosRes] = await Promise.all([
    supabase.from("lancamentos_financeiros").select("valor").eq("tipo", "receita").eq("status", "pago").gte("data_pagamento", dataInicioStr).lte("data_pagamento", dataFimStr),
    supabase.from("lancamentos_financeiros").select("valor").eq("tipo", "despesa").eq("status", "pago").gte("data_pagamento", dataInicioStr).lte("data_pagamento", dataFimStr),
    supabase.from("lancamentos_financeiros").select("valor").eq("status", "atrasado"),
  ]);

  const total_receitas = (receitasRes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
  const total_despesas = (despesasRes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
  const total_inadimplencia = (atrasadosRes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);

  return {
    total_receitas,
    total_despesas,
    saldo: total_receitas - total_despesas,
    total_inadimplencia,
  };
}