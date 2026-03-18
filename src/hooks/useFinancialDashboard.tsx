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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke("financial-dashboard", {
        body: {
          action: "fluxo_caixa",
          user_id: user.id,
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
  });
};

export const useComposicaoDespesas = (params: ComposicaoDespesasParams) => {
  return useQuery({
    queryKey: ["composicao-despesas", params],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke("financial-dashboard", {
        body: {
          action: "composicao_despesas",
          user_id: user.id,
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
  });
};

export const useInadimplenciaPorImovel = () => {
  return useQuery({
    queryKey: ["inadimplencia-por-imovel"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke("financial-dashboard", {
        body: {
          action: "inadimplencia_por_imovel",
          user_id: user.id,
        },
      });

      if (error) throw error;
      return data;
    },
  });
};