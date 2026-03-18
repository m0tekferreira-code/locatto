import { useEffect, useState } from "react";
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
import { Search, MoreVertical, RefreshCw, Ban, CheckCircle } from "lucide-react";

interface Account {
  id: string;
  account_name: string;
  subscription_status: string;
  data_expiracao: string | null;
  created_at: string;
  owner_id: string;
  plan_id: string | null;
  owner_email?: string;
}

const AdminAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [searchTerm, accounts]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);

      // Fetch all accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch owner emails from auth
      const { data: authData, error: authError } = await supabase.functions.invoke('admin-list-users');
      
      let authUsers: any[] = [];
      if (!authError && authData?.users) {
        authUsers = authData.users;
      }

      // Combine data
      const accountsWithEmails = accountsData.map(account => {
        const authUser = authUsers.find(u => u.id === account.owner_id);
        return {
          ...account,
          owner_email: authUser?.email || 'N/A'
        };
      });

      setAccounts(accountsWithEmails);
      setFilteredAccounts(accountsWithEmails);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    if (!searchTerm.trim()) {
      setFilteredAccounts(accounts);
      return;
    }

    const filtered = accounts.filter(
      (account) =>
        account.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredAccounts(filtered);
  };

  const extendLicense = async (accountId: string, days: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-license', {
        body: {
          account_id: accountId,
          days_to_add: days
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Licença estendida",
        description: `Licença estendida por ${days} dias com sucesso.`,
      });

      fetchAccounts();
    } catch (error) {
      console.error('Error extending license:', error);
      toast({
        title: "Erro",
        description: "Não foi possível estender a licença.",
        variant: "destructive",
      });
    }
  };

  const revokeLicense = async (accountId: string) => {
    if (!confirm("Tem certeza que deseja revogar a licença desta conta?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ 
          data_expiracao: new Date().toISOString(),
          subscription_status: 'expired'
        })
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Licença revogada",
        description: "A licença da conta foi revogada.",
      });

      fetchAccounts();
    } catch (error) {
      console.error('Error revoking license:', error);
      toast({
        title: "Erro",
        description: "Não foi possível revogar a licença.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (account: Account) => {
    if (!account.data_expiracao) {
      return <Badge variant="secondary">Perpétuo</Badge>;
    }

    const expiryDate = new Date(account.data_expiracao);
    const now = new Date();

    if (expiryDate < now) {
      return <Badge variant="destructive">Expirado</Badge>;
    }

    if (account.subscription_status === 'trial') {
      return <Badge variant="outline" className="border-warning text-warning">Trial</Badge>;
    }

    return <Badge variant="default" className="bg-success">Ativo</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sem expiração';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <AppLayout title="Gestão de Contas">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Contas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as contas de clientes da plataforma
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome da conta ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchAccounts} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">Carregando contas...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CONTA</TableHead>
                    <TableHead>EMAIL</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>PLANO</TableHead>
                    <TableHead>EXPIRA EM</TableHead>
                    <TableHead>CRIADA EM</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Nenhuma conta encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.account_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {account.owner_email}
                        </TableCell>
                        <TableCell>{getStatusBadge(account)}</TableCell>
                        <TableCell>
                          {account.plan_id ? (
                            <Badge variant="outline">{account.plan_id}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(account.data_expiracao)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(account.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => extendLicense(account.id, 30)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Estender 30 dias
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => extendLicense(account.id, 90)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Estender 90 dias
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => extendLicense(account.id, 365)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Estender 1 ano
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => revokeLicense(account.id)}
                                className="text-destructive"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Revogar Licença
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
    </AppLayout>
  );
};

export default AdminAccounts;
