import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePropertySummary = (userId: string | undefined, accountId: string | null) => {
  return useQuery({
    queryKey: ["property-summary", userId, accountId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const filterColumn = accountId ? "account_id" : "user_id";
      const filterValue = accountId || userId;

      const { data: properties, error } = await supabase
        .from("properties")
        .select("status")
        .eq(filterColumn, filterValue);

      if (error) throw error;

      const statusCount = properties?.reduce(
        (acc, prop) => {
          const status = prop.status || "available";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ) || {};

      const total = properties?.length || 0;

      return {
        total,
        available: statusCount.available || 0,
        rented: statusCount.rented || 0,
        maintenance: statusCount.maintenance || 0,
        reserved: statusCount.reserved || 0,
      };
    },
    enabled: !!userId,
  });
};
