import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";

export interface ContractHistoryEntry {
  id: string;
  contract_id: string;
  account_id: string | null;
  user_id: string | null;
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const useContractHistory = (contractId: string | undefined) => {
  return useQuery({
    queryKey: ["contract-history", contractId],
    queryFn: async () => {
      if (!contractId) throw new Error("No contract id");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("contract_history")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractHistoryEntry[];
    },
    enabled: !!contractId,
  });
};

/** Manually log a client-side event (document upload, extra charge, etc.) */
export const useLogContractEvent = () => {
  const queryClient = useQueryClient();
  const { accountId } = useAccountId();

  return useMutation({
    mutationFn: async (params: {
      contractId: string;
      eventType: string;
      description: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("contract_history").insert({
        contract_id: params.contractId,
        account_id: accountId,
        user_id: user?.id ?? null,
        event_type: params.eventType,
        description: params.description,
        metadata: params.metadata ?? {},
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contract-history", variables.contractId] });
    },
  });
};
