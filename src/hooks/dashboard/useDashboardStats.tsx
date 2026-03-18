import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays } from "date-fns";

export const useDashboardStats = (userId: string | undefined, accountId: string | null) => {
  return useQuery({
    queryKey: ["dashboard-stats", userId, accountId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const filterColumn = accountId ? "account_id" : "user_id";
      const filterValue = accountId || userId;

      // Total properties
      const { count: totalProperties } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue);

      // Active contracts
      const { count: activeContracts } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .eq("status", "active");

      // Contracts expiring in next 30 days
      const now = new Date();
      const in30Days = addDays(now, 30);
      const { count: contractsExpiring30 } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .eq("status", "active")
        .not("end_date", "is", null)
        .gte("end_date", now.toISOString().split("T")[0])
        .lte("end_date", in30Days.toISOString().split("T")[0]);

      // Contracts expiring between 31 and 50 days
      const in50Days = addDays(now, 50);
      const { count: contractsExpiring50 } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .eq("status", "active")
        .not("end_date", "is", null)
        .gt("end_date", in30Days.toISOString().split("T")[0])
        .lte("end_date", in50Days.toISOString().split("T")[0]);

      // Contracts needing readjustment (active contracts older than 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      const { count: contractsReadjustment } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .eq("status", "active")
        .lte("start_date", twelveMonthsAgo.toISOString().split("T")[0]);

      // Monthly revenue (paid this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyInvoices } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq(filterColumn, filterValue)
        .eq("status", "paid")
        .gte("payment_date", startOfMonth.toISOString());

      const monthlyRevenue = monthlyInvoices?.reduce(
        (sum, inv) => sum + Number(inv.total_amount || 0),
        0
      ) || 0;

      // Pending invoices (open)
      const { count: pendingInvoices } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .in("status", ["pending"]);

      // Overdue invoices
      const { count: overdueInvoices } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .eq("status", "overdue");

      // Total billed (all invoices amount)
      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq(filterColumn, filterValue)
        .in("status", ["pending", "overdue", "paid"]);

      const totalBilled = allInvoices?.reduce(
        (sum, inv) => sum + Number(inv.total_amount || 0),
        0
      ) || 0;

      // Scheduled visits count
      // Use user_id here to keep compatibility with partially migrated databases.
      const { count: scheduledVisits } = await supabase
        .from("scheduled_visits")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "scheduled");

      // Contacts / Leads count
      const { count: leadsCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .eq("contact_type", "lead");

      // Properties by portal status (announced)
      const { count: announcedProperties } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .eq("publish_to_portals", true);

      return {
        totalProperties: totalProperties || 0,
        activeContracts: activeContracts || 0,
        contractsExpiring30: contractsExpiring30 || 0,
        contractsExpiring50: contractsExpiring50 || 0,
        contractsReadjustment: contractsReadjustment || 0,
        monthlyRevenue,
        pendingInvoices: pendingInvoices || 0,
        overdueInvoices: overdueInvoices || 0,
        totalBilled,
        scheduledVisits: scheduledVisits || 0,
        leadsCount: leadsCount || 0,
        announcedProperties: announcedProperties || 0,
      };
    },
    enabled: !!userId,
  });
};
