import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  DollarSign,
  TrendingUp,
  Building,
  FileText,
  UserCheck,
  UserX,
  Clock,
  Shield,
  ShieldCheck,
  Package,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

interface AdminStats {
  accounts: {
    total: number;
    active: number;
    trial: number;
    expired: number;
    newThisMonth: number;
  };
  revenue: {
    total: number;
    monthly: number;
  };
  recentPayments: Array<{
    id: string;
    amount_cents: number;
    status: string;
    created_at: string;
    plan_id?: string;
  }>;
  stats: {
    totalProperties: number;
    totalContracts: number;
  };
}

interface BillingPlan {
  id: string;
  name: string;
  price_cents: number;
  days_duration: number;
}

interface PlanDistribution {
  plan_id: string | null;
  plan_name: string;
  count: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [planDist, setPlanDist] = useState<PlanDistribution[]>([]);
  const [adminUsersCount, setAdminUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchStats(), fetchExtraData()]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-stats");
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas.",
        variant: "destructive",
      });
    }
  };

  const fetchExtraData = async () => {
    const [plansResult, adminCountResult, accountsResult] = await Promise.all([
      supabase
        .from("billing_plans")
        .select("id, name, price_cents, days_duration")
        .order("price_cents"),
      supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .in("role", ["admin", "super_admin"]),
      supabase.from("accounts").select("plan_id"),
    ]);

    if (plansResult.data) setPlans(plansResult.data);
    if (adminCountResult.count !== null) setAdminUsersCount(adminCountResult.count);

    if (accountsResult.data && plansResult.data) {
      const countMap: Record<string, number> = {};
      for (const acc of accountsResult.data) {
        const key = acc.plan_id ?? "__none__";
        countMap[key] = (countMap[key] ?? 0) + 1;
      }
      const planNameMap = Object.fromEntries(plansResult.data.map((p) => [p.id, p.name]));
      const distribution: PlanDistribution[] = Object.entries(countMap).map(([planId, count]) => ({
        plan_id: planId === "__none__" ? null : planId,
        plan_name: planId === "__none__" ? "Sem plano" : (planNameMap[planId] ?? planId),
        count,
      }));
      distribution.sort((a, b) => b.count - a.count);
      setPlanDist(distribution);
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <AppLayout title="Painel Super Admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            <p className="mt-4 text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalAccounts = stats?.accounts.total ?? 0;

  return (
    <AppLayout title="Painel Super Admin">
      <div className="space-y-6">

        {/* ── Hero header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Painel Super Admin</h1>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  Super Admin
                </Badge>
              </div>
              <p className="mt-0.5 text-violet-100 text-sm">
                Controle total da plataforma · {totalAccounts} conta{totalAccounts !== 1 ? "s" : ""} cadastrada{totalAccounts !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/20 hover:text-white"
            onClick={fetchData}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* ── Quick-access navigation cards ───────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/accounts">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-blue-500">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Contas</p>
                  <p className="text-3xl font-bold mt-1">{totalAccounts}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="text-green-600 font-medium">{stats?.accounts.active ?? 0} ativas</span>
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/users">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-purple-500">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Usuários Admin</p>
                  <p className="text-3xl font-bold mt-1">{adminUsersCount}</p>
                  <p className="text-sm text-muted-foreground mt-1">admins + super admins</p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <ShieldCheck className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/plans">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-amber-500">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Planos</p>
                  <p className="text-3xl font-bold mt-1">{plans.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">planos cadastrados</p>
                </div>
                <div className="rounded-full bg-amber-100 p-3">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/payments">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-green-500">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Receita Mensal</p>
                  <p className="text-2xl font-bold mt-1 text-green-700">
                    {formatCurrency(stats?.revenue.monthly ?? 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total: {formatCurrency(stats?.revenue.total ?? 0)}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ── Account status breakdown ─────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novas este mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.accounts.newThisMonth ?? 0}</div>
              <p className="text-xs text-muted-foreground">cadastros recentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.accounts.active ?? 0}</div>
              <p className="text-xs text-muted-foreground">licenças válidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{stats?.accounts.trial ?? 0}</div>
              <p className="text-xs text-muted-foreground">período de teste</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
              <UserX className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.accounts.expired ?? 0}</div>
              <p className="text-xs text-muted-foreground">necessitam renovação</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Platform usage stats ─────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.stats.totalProperties ?? 0}</div>
              <p className="text-xs text-muted-foreground">na plataforma</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.stats.totalContracts ?? 0}</div>
              <p className="text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Plan distribution + Recent payments ──────────────────── */}
        <div className="grid gap-4 md:grid-cols-2">

          {/* Plan distribution */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Distribuição por Plano</CardTitle>
              <Link to="/admin/plans">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                  Gerenciar <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {planDist.length > 0 ? (
                <div className="space-y-3">
                  {planDist.map((item) => {
                    const pct = totalAccounts > 0 ? item.count / totalAccounts : 0;
                    return (
                      <div key={item.plan_id ?? "__none__"} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-32 truncate">{item.plan_name}</span>
                        <div className="flex-1 h-2 rounded-full bg-violet-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${Math.max(4, pct * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-6 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum dado disponível.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pagamentos Recentes</CardTitle>
              <Link to="/admin/payments">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats?.recentPayments && stats.recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentPayments.slice(0, 6).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(payment.amount_cents)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={payment.status === "paid" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {payment.status === "paid" ? "Pago" : payment.status}
                        </Badge>
                        {payment.plan_id && (
                          <Badge variant="outline" className="text-xs">
                            {payment.plan_id}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum pagamento registrado ainda.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
