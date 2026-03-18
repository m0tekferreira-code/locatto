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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.rpc("get_resumo_financeiro", {
        p_user_id: user.id,
        p_data_inicio: data_inicio,
        p_data_fim: data_fim,
      });

      if (error) {
        console.error("Erro ao buscar resumo financeiro:", error);
        throw error;
      }

      // A função retorna um array com um único objeto
      const resumo = data[0] || {
        total_receitas: 0,
        total_despesas: 0,
        saldo: 0,
        total_inadimplencia: 0,
      };

      return {
        total_receitas: Number(resumo.total_receitas),
        total_despesas: Number(resumo.total_despesas),
        saldo: Number(resumo.saldo),
        total_inadimplencia: Number(resumo.total_inadimplencia),
      };
    },
    enabled: !!data_inicio && !!data_fim,
  });
};

/**
 * Função assíncrona standalone para obter resumo financeiro
 * Útil para uso fora de componentes React
 */
export async function getResumoFinanceiro(
  data_inicio: Date,
  data_fim: Date
): Promise<ResumoFinanceiro> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  // Converter datas para formato YYYY-MM-DD
  const dataInicioStr = data_inicio.toISOString().split('T')[0];
  const dataFimStr = data_fim.toISOString().split('T')[0];

  const { data, error } = await supabase.rpc("get_resumo_financeiro", {
    p_user_id: user.id,
    p_data_inicio: dataInicioStr,
    p_data_fim: dataFimStr,
  });

  if (error) {
    console.error("Erro ao buscar resumo financeiro:", error);
    throw error;
  }

  const resumo = data[0] || {
    total_receitas: 0,
    total_despesas: 0,
    saldo: 0,
    total_inadimplencia: 0,
  };

  return {
    total_receitas: Number(resumo.total_receitas),
    total_despesas: Number(resumo.total_despesas),
    saldo: Number(resumo.saldo),
    total_inadimplencia: Number(resumo.total_inadimplencia),
  };
}