import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface OverdueBucket {
  label: string;
  minDays: number;
  maxDays: number;
  count: number;
  total: number;
  invoices: any[];
}

const BUCKETS = [
  { label: "1-3 dias", minDays: 1, maxDays: 3 },
  { label: "4-5 dias", minDays: 4, maxDays: 5 },
  { label: "6-15 dias", minDays: 6, maxDays: 15 },
  { label: "16-30 dias", minDays: 16, maxDays: 30 },
  { label: "31-45 dias", minDays: 31, maxDays: 45 },
  { label: "+45 dias", minDays: 46, maxDays: Infinity },
];

export const useOverdueBreakdown = (userId: string | undefined, accountId: string | null) => {
  return useQuery({
    queryKey: ["overdue-breakdown", userId, accountId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const filterColumn = accountId ? "account_id" : "user_id";
      const filterValue = accountId || userId;

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          due_date,
          total_amount,
          status,
          contract:contracts(tenant_name, tenant_phone, tenant_email),
          property:properties(name)
        `)
        .eq(filterColumn, filterValue)
        .eq("status", "overdue")
        .order("due_date", { ascending: true });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const buckets: OverdueBucket[] = BUCKETS.map((b) => ({
        ...b,
        count: 0,
        total: 0,
        invoices: [],
      }));

      (data || []).forEach((inv) => {
        const dueDate = new Date(inv.due_date + "T00:00:00");
        const days = differenceInDays(today, dueDate);
        if (days < 1) return;

        const bucket = buckets.find((b) => days >= b.minDays && days <= b.maxDays);
        if (bucket) {
          bucket.count++;
          bucket.total += Number(inv.total_amount || 0);
          bucket.invoices.push({ ...inv, daysOverdue: days });
        }
      });

      const totalOverdue = buckets.reduce((s, b) => s + b.total, 0);
      const totalCount = buckets.reduce((s, b) => s + b.count, 0);

      return { buckets, totalOverdue, totalCount };
    },
    enabled: !!userId,
  });
};
