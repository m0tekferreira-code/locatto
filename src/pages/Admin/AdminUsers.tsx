import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, RefreshCw, MoreVertical, Shield, User, Edit } from "lucide-react";

interface AdminUser {
  user_id: string;
  role: string;
  full_name: string | null;
  data_expiracao: string | null;
  account_id: string | null;
  account_name: string | null;
  plan_id: string | null;
  email?: string;
}

interface BillingPlan {
  id: string;
  name: string;
  price_cents: number;
  days_duration: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, users]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchPlans()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("billing_plans")
      .select("id, name, price_cents, days_duration")
      .order("price_cents");
    if (!error && data) {
      setPlans(data);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch admin and super_admin roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "super_admin"]);

      if (rolesError) throw rolesError;
      if (!rolesData || rolesData.length === 0) {
        setUsers([]);
        return;
      }

      const userIds = rolesData.map((r) => r.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, data_expiracao, account_id")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Collect account IDs to fetch account names + plan_ids
      const accountIds = [
        ...new Set(profilesData?.map((p) => p.account_id).filter(Boolean)),
      ] as string[];

      const accountsMap: Record<string, { account_name: string; plan_id: string | null }> = {};
      if (accountIds.length > 0) {
        const { data: accountsData } = await supabase
          .from("accounts")
          .select("id, account_name, plan_id")
          .in("id", accountIds);

        if (accountsData) {
          accountsData.forEach((a) => {
            accountsMap[a.id] = { account_name: a.account_name, plan_id: a.plan_id };
          });
        }
      }

      // Fetch emails from auth
      const { data: authData } = await supabase.functions.invoke("admin-list-users");
      const authUsers: { id: string; email?: string }[] = authData?.users || [];

      // Combine data
      const combined: AdminUser[] = rolesData.map((role) => {
        const profile = profilesData?.find((p) => p.id === role.user_id);
        const accountId = profile?.account_id || null;
        const accountInfo = accountId ? accountsMap[accountId] : null;
        const authUser = authUsers.find((u) => u.id === role.user_id);

        return {
          user_id: role.user_id,
          role: role.role,
          full_name: profile?.full_name || null,
          data_expiracao: profile?.data_expiracao || null,
          account_id: accountId,
          account_name: accountInfo?.account_name || null,
          plan_id: accountInfo?.plan_id || null,
          email: authUser?.email || "N/A",
        };
      });

      setUsers(combined);
      setFilteredUsers(combined);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários admin.",
        variant: "destructive",
      });
    }
  };

  const filterUsers = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredUsers(
      users.filter(
        (u) =>
          u.email?.toLowerCase().includes(term) ||
          u.full_name?.toLowerCase().includes(term) ||
          u.account_name?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, users]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const openEditPlan = (user: AdminUser) => {
    setEditingUser(user);
    setSelectedPlan(user.plan_id || "");
  };

  const handleSavePlan = async () => {
    if (!editingUser?.account_id) {
      toast({
        title: "Erro",
        description: "Este usuário não tem uma conta associada.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ plan_id: selectedPlan || null })
        .eq("id", editingUser.account_id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Plano atualizado com sucesso." });
      setEditingUser(null);
      await fetchUsers();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o plano.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <Badge variant="destructive" className="gap-1">
          <Shield className="h-3 w-3" />
          Super Admin
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1">
        <User className="h-3 w-3" />
        Admin
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sem expiração";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getExpirationBadge = (data_expiracao: string | null) => {
    if (!data_expiracao) return <Badge variant="secondary">Perpétuo</Badge>;
    const expiry = new Date(data_expiracao);
    if (expiry < new Date()) return <Badge variant="destructive">Expirado</Badge>;
    return (
      <Badge variant="outline" className="border-green-500 text-green-600">
        {formatDate(data_expiracao)}
      </Badge>
    );
  };

  return (
    <AppLayout title="Usuários Admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários Admin</h1>
          <p className="text-muted-foreground">
            Todos os administradores cadastrados na plataforma
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou conta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">Carregando usuários...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NOME</TableHead>
                    <TableHead>EMAIL</TableHead>
                    <TableHead>ROLE</TableHead>
                    <TableHead>CONTA</TableHead>
                    <TableHead>PLANO</TableHead>
                    <TableHead>LICENÇA</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        Nenhum usuário admin encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {user.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.account_name ? (
                            <span className="text-sm">{user.account_name}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.plan_id ? (
                            <Badge variant="outline">{user.plan_id}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getExpirationBadge(user.data_expiracao)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditPlan(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Alterar Plano
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>
              Altere o plano da conta de{" "}
              <strong>{editingUser?.full_name || editingUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="plan-select">Plano</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger id="plan-select">
                <SelectValue placeholder="Selecionar plano..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem plano</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} — R$ {(plan.price_cents / 100).toFixed(2)} / {plan.days_duration} dias
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminUsers;
