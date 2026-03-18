import { AppLayout } from "@/components/Layout/AppLayout";
import { ContractStatCard } from "@/components/Dashboard/ContractStatCard";
import { FinancialSummaryCard } from "@/components/Dashboard/FinancialSummaryCard";
import { PropertySummaryCard } from "@/components/Dashboard/PropertySummaryCard";
import { CommercialCard } from "@/components/Dashboard/CommercialCard";
import { CalculatorCard } from "@/components/Dashboard/CalculatorCard";
import { InvoicesTable } from "@/components/Dashboard/InvoicesTable";
import { OverdueBreakdownCard } from "@/components/Dashboard/OverdueBreakdownCard";
import { AlertTriangle, RefreshCw, FileCheck, MessageSquare, Calculator, TrendingUp, Percent } from "lucide-react";
import { useDashboardStats } from "@/hooks/dashboard/useDashboardStats";
import { useRecentInvoices } from "@/hooks/dashboard/useRecentInvoices";
import { useOverdueBreakdown } from "@/hooks/dashboard/useOverdueBreakdown";
import { usePropertySummary } from "@/hooks/dashboard/usePropertySummary";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(user?.id, accountId);
  const { data: invoices, isLoading: invoicesLoading } = useRecentInvoices(user?.id, accountId, 10);
  const { data: overdueData, isLoading: overdueLoading } = useOverdueBreakdown(user?.id, accountId);
  const { data: propertySummary, isLoading: propertySummaryLoading } = usePropertySummary(user?.id, accountId);

  return (
    <AppLayout title="Dashboard">
      {/* Row 1: Contract Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        ) : (
          <>
            <ContractStatCard
              icon={AlertTriangle}
              iconColor="text-warning"
              title="Vencendo em até 30 dias"
              subtitle="Contratos próximos do vencimento"
              value={stats?.contractsExpiring30 || 0}
              linkText="Ver contratos"
              linkTo="/contratos?filter=expiring30"
            />
            <ContractStatCard
              icon={AlertTriangle}
              iconColor="text-orange-500"
              title="Vencendo em até 50 dias"
              subtitle="Contratos a vencer em breve"
              value={stats?.contractsExpiring50 || 0}
              linkText="Ver contratos"
              linkTo="/contratos?filter=expiring50"
            />
            <ContractStatCard
              icon={RefreshCw}
              iconColor="text-info"
              title="Contratos em reajuste"
              value={stats?.contractsReadjustment || 0}
              linkText="Ver contratos"
              linkTo="/contratos?filter=readjustment"
            />
            <ContractStatCard
              icon={FileCheck}
              iconColor="text-success"
              title="Contratos ativos"
              value={stats?.activeContracts || 0}
              linkText="Ver contratos"
              linkTo="/contratos?filter=active"
            />
          </>
        )}
      </div>

      {/* Row 2: Financial, Properties, Commercial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        ) : (
          <>
            <FinancialSummaryCard
              openInvoices={(stats?.pendingInvoices || 0) + (stats?.overdueInvoices || 0)}
              overdueInvoices={stats?.overdueInvoices || 0}
              totalBilled={stats?.totalBilled || 0}
            />
            {propertySummaryLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <PropertySummaryCard
                unavailable={propertySummary?.maintenance || 0}
                contracted={propertySummary?.rented || 0}
                available={propertySummary?.available || 0}
                announced={stats?.announcedProperties || 0}
              />
            )}
            <CommercialCard
              leads={stats?.leadsCount || 0}
              scheduledVisits={stats?.scheduledVisits || 0}
              proposals={0}
            />
          </>
        )}
      </div>

      {/* Row 2.5: Overdue Breakdown */}
      <div className="mb-6">
        {overdueLoading ? (
          <Skeleton className="h-48" />
        ) : overdueData && overdueData.totalCount > 0 ? (
          <OverdueBreakdownCard
            buckets={overdueData.buckets}
            totalOverdue={overdueData.totalOverdue}
            totalCount={overdueData.totalCount}
          />
        ) : null}
      </div>

      {/* Row 3: Table + Calculators */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          {invoicesLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <InvoicesTable invoices={invoices || []} />
          )}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-4">
            <CalculatorCard icon={TrendingUp} title="Calculadora de Inflação" />
            <CalculatorCard icon={Percent} title="Calculadora de Juros/Multa" />
            <CalculatorCard icon={Calculator} title="Calculadora de financiamento" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
