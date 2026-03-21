import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreVertical, Pencil, Power, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import UserFormDialog from "@/components/Users/UserFormDialog";

interface UserProfile {
  id: string;
  full_name: string;
  is_active: boolean;
  last_access: string | null;
  email?: string;
  role?: string;
}

const UsersList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  useEffect(() => {
    if (accountId) {
      fetchUsers();
    }
  }, [user, accountId]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    if (!user || !accountId) return;

    try {
      setLoading(true);

      // Fetch profiles filtered by account_id
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_id", accountId)
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch auth users via edge function
      const { data: authUsersData, error: authError } = await supabase.functions.invoke('admin-list-users');
      
      let authUsers: any[] = [];
      if (authError) {
        console.error("Error fetching auth users:", authError);
      } else if (authUsersData?.users) {
        authUsers = authUsersData.users;
      }

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithDetails = profilesData.map((profile) => {
        const authUser = Array.isArray(authUsers) ? authUsers.find((u: any) => u.id === profile.id) : null;
        const userRole = rolesData?.find((r: any) => r.user_id === profile.id);

        return {
          ...profile,
          email: authUser?.email || "Sem e-mail",
          role: userRole?.role || "user",
        };
      });

      setUsers(usersWithDetails);
      setFilteredUsers(usersWithDetails);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredUsers(filtered);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem alterar o status de usuários.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Usuário ${!currentStatus ? "ativado" : "desativado"} com sucesso.`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do usuário.",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem remover usuários.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      // Delete user via edge function
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso.",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      super_admin: { label: "Super Admin", variant: "default" },
      admin: { label: "Administrador", variant: "default" },
      socio: { label: "Sócio", variant: "secondary" },
      assistente: { label: "Assistente", variant: "outline" },
      full: { label: "Full", variant: "secondary" },
      agenda: { label: "Agenda", variant: "outline" },
      cadastro_leads: { label: "Cadastro/Leads", variant: "outline" },
      financeiro: { label: "Financeiro", variant: "outline" },
      trial: { label: "Trial", variant: "outline" },
    };

    const config = roleConfig[role] || { label: role || "Usuário", variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  if (adminLoading) {
    return (
      <AppLayout title="Usuários">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Verificando permissões...</p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout title="Usuários">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Você não tem permissão para acessar esta página.</p>
              <p className="mt-2">Apenas administradores podem gerenciar usuários.</p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Usuários">
      <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
                <p className="text-muted-foreground">
                  Gerencie os usuários que possuem acesso à sua conta da plataforma.
                </p>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar novo
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">Carregando usuários...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedUsers.length === filteredUsers.length &&
                              filteredUsers.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>NOME</TableHead>
                        <TableHead>EMAIL</TableHead>
                        <TableHead>PERFIL</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            Nenhum usuário encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() => toggleUserSelection(user.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{user.full_name || "Sem nome"}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{getRoleBadge(user.role || "user")}</TableCell>
                            <TableCell>
                              <Badge variant={user.is_active ? "secondary" : "outline"}>
                                {user.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                                  >
                                    <Power className="mr-2 h-4 w-4" />
                                    {user.is_active ? "Desativar" : "Ativar"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteUser(user.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remover
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

          <UserFormDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSuccess={fetchUsers}
            accountId={accountId}
          />

          <UserFormDialog
            open={!!editingUser}
            onOpenChange={(open) => !open && setEditingUser(null)}
            user={editingUser}
            onSuccess={fetchUsers}
            accountId={accountId}
          />
        </AppLayout>
  );
};

export default UsersList;