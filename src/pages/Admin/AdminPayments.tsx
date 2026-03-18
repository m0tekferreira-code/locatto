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
import { Search, RefreshCw, DollarSign } from "lucide-react";

interface Payment {
  id: number;
  user_id: string;
  amount_cents: number;
  status: string;
  plan_id: string | null;
  provider: string;
  external_tx_id: string | null;
  created_at: string;
  user_email?: string;
}

const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [searchTerm, payments]);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      // Fetch all payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch user emails
      const { data: authData, error: authError } = await supabase.functions.invoke('admin-list-users');

      let authUsers: any[] = [];
      if (!authError && authData?.users) {
        authUsers = authData.users;
      }

      // Combine data
      const paymentsWithEmails = paymentsData.map(payment => {
        const authUser = authUsers.find(u => u.id === payment.user_id);
        return {
          ...payment,
          user_email: authUser?.email || 'N/A'
        };
      });

      setPayments(paymentsWithEmails);
      setFilteredPayments(paymentsWithEmails);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pagamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    if (!searchTerm.trim()) {
      setFilteredPayments(payments);
      return;
    }

    const filtered = payments.filter(
      (payment) =>
        payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.external_tx_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.plan_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredPayments(filtered);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: "Pago", variant: "default" },
      pending: { label: "Pendente", variant: "secondary" },
      failed: { label: "Falhou", variant: "destructive" },
      cancelled: { label: "Cancelado", variant: "outline" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalRevenue = filteredPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <AppLayout title="Histórico de Pagamentos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Pagamentos</h1>
            <p className="text-muted-foreground">
              Visualize todos os pagamentos recebidos na plataforma
            </p>
          </div>
          <Card className="w-auto">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Receita Total (Filtrado)</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email, ID da transação ou plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchPayments} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">Carregando pagamentos...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>EMAIL</TableHead>
                    <TableHead>VALOR</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>PLANO</TableHead>
                    <TableHead>PROVEDOR</TableHead>
                    <TableHead>TX ID</TableHead>
                    <TableHead>DATA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Nenhum pagamento encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">
                          #{payment.id}
                        </TableCell>
                        <TableCell className="text-sm">{payment.user_email}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount_cents)}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          {payment.plan_id ? (
                            <Badge variant="outline">{payment.plan_id}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{payment.provider}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {payment.external_tx_id ? (
                            payment.external_tx_id.substring(0, 12) + '...'
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(payment.created_at)}
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

export default AdminPayments;
