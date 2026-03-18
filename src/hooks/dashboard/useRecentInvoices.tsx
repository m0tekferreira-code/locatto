import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRecentInvoices = (userId: string | undefined, accountId: string | null, limit = 5) => {
  return useQuery({
    queryKey: ["recent-invoices", userId, accountId, limit],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const filterColumn = accountId ? "account_id" : "user_id";
      const filterValue = accountId || userId;

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          property:properties(name),
          contract:contracts(tenant_name)
        `)
        .eq(filterColumn, filterValue)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    },
    enabled: !!userId,
  });
};
