import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccountId } from "@/hooks/useAccountId";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Receipt, Eye, DollarSign, AlertCircle, Zap, Calendar as CalendarIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvoiceCard } from "@/components/Responsive/InvoiceCard";
import { FilterDrawer } from "@/components/Filters/FilterDrawer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";
import { GenerateInvoiceDialog } from "@/components/Invoices/GenerateInvoiceDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 50;

const InvoicesList = () => {
  const { user } = useAuth();
  const { accountId, loading: accountLoading } = useAccountId();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [referenceMonth, setReferenceMonth] = useState<Date>(new Date());

  const filterColumn = accountId ? "account_id" : "user_id";
  const filterValue = accountId || user?.id;

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", user?.id, accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          contracts (
            id,
            contract_number,
            tenant_name,
            tenant_email,
            tenant_phone
          ),
          properties (
            id,
            name,
            address,
            city,
            state,
            owner_name,
            owner_email
          )
        `)
        .eq(filterColumn, filterValue)
        .order("due_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !accountLoading,
  });

  const { data: activeContractsCount } = useQuery({
    queryKey: ["active-contracts-count", user?.id, accountId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq(filterColumn, filterValue)
        .eq("status", "active");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id && !accountLoading,
  });

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await supabase.functions.invoke('generate-invoices', {
        body: {
          mode: 'all',
          reference_month: format(referenceMonth, 'yyyy-MM-dd'),
          auto_billing: false
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Faturas geradas com sucesso!",
        description: `${data.created} fatura(s) criada(s), ${data.skipped} ignorada(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar faturas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesSearch =
      invoice.contracts?.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.properties?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.properties?.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.contracts?.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesPaymentMethod = paymentMethodFilter === "all" || invoice.payment_method === paymentMethodFilter;
    const matchesContract = !contractFilter || invoice.contracts?.contract_number?.toLowerCase().includes(contractFilter.toLowerCase());
    const matchesOwner = !ownerFilter || invoice.properties?.owner_name?.toLowerCase().includes(ownerFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPaymentMethod && matchesContract && matchesOwner;
  });

  const paginatedInvoices = filteredInvoices?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil((filteredInvoices?.length || 0) / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string, dueDate: string) => {
    const variants = {
      paid: { variant: "default" as const, label: "Pago", icon: null },
      pending: { variant: "secondary" as const, label: "Pendente", icon: null },
      overdue: { variant: "destructive" as const, label: "Vencida", icon: AlertCircle },
      cancelled: { variant: "outline" as const, label: "Cancelada", icon: null },
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon && <config.icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const totals = filteredInvoices?.reduce(
    (acc, invoice) => {
      if (invoice.status === "paid") {
        acc.paid += Number(invoice.total_amount);
      } else if (invoice.status === "pending" || invoice.status === "overdue") {
        acc.pending += Number(invoice.total_amount);
      }
      acc.total += Number(invoice.total_amount);
      return acc;
    },
    { paid: 0, pending: 0, total: 0 }
  );

  const hasPendingInvoices = invoices?.some(
    (invoice) => invoice.status === "overdue"
  );

  return (
    <AppLayout title="Faturas">
          {/* Alert for pending invoices */}
          {hasPendingInvoices && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Ops! Temos faturas pendentes</strong>
                <p className="text-sm mt-1">
                  Notamos que você possui faturas pendentes. Para continuar aproveitando todos os recursos da plataforma, 
                  por favor, confira suas faturas. Seu acesso está temporariamente limitado até a regularização dos pagamentos.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Bulk Generation Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Geração em Massa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Mês de Competência</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !referenceMonth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {referenceMonth ? format(referenceMonth, "MMMM 'de' yyyy", { locale: ptBR }) : "Selecione o mês"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={referenceMonth}
                        onSelect={(date) => date && setReferenceMonth(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="md:w-auto w-full" disabled={!activeContractsCount}>
                      <Zap className="mr-2 h-4 w-4" />
                      Gerar Faturas para Todos os Contratos
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Gerar faturas em massa?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>Você está prestes a gerar faturas para todos os contratos ativos.</p>
                        <div className="bg-muted p-4 rounded-lg space-y-1">
                          <p className="font-medium">Resumo:</p>
                          <p>• Contratos ativos: {activeContractsCount}</p>
                          <p>• Competência: {format(referenceMonth, "MMMM 'de' yyyy", { locale: ptBR })}</p>
                        </div>
                        <p className="text-sm">Faturas duplicadas serão automaticamente ignoradas.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => generateAllMutation.mutate()}
                        disabled={generateAllMutation.isPending}
                      >
                        {generateAllMutation.isPending ? "Gerando..." : "Gerar Faturas"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Em Aberto</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  R$ {totals?.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {totals?.paid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                <Receipt className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {totals?.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por inquilino, imóvel, proprietário ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <GenerateInvoiceDialog />

              <Link to="/faturas/nova">
                <Button className="w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Fatura Manual
                </Button>
              </Link>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex flex-col md:flex-row gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Forma de Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as formas</SelectItem>
                  <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Filtrar por contrato..."
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="w-full md:w-[200px]"
              />

              <Input
                placeholder="Filtrar por proprietário..."
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full md:w-[200px]"
              />
            </div>

            {/* Mobile Filters */}
            <FilterDrawer onClear={() => {
              setStatusFilter("all");
              setPaymentMethodFilter("all");
              setContractFilter("");
              setOwnerFilter("");
            }}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Forma de Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as formas</SelectItem>
                  <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Filtrar por contrato..."
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="w-full"
              />

              <Input
                placeholder="Filtrar por proprietário..."
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full"
              />
            </FilterDrawer>
          </div>

          {/* Invoices Display */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-muted-foreground">Carregando faturas...</p>
              </div>
            </div>
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <>
              {/* Mobile: Cards */}
              <div className="md:hidden grid gap-4">
                {paginatedInvoices?.map((invoice) => (
                  <InvoiceCard 
                    key={invoice.id} 
                    invoice={invoice} 
                    getStatusBadge={getStatusBadge} 
                  />
                ))}
              </div>

              {/* Desktop: Table */}
              <Card className="hidden md:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Proprietário</TableHead>
                          <TableHead>Contrato</TableHead>
                          <TableHead>Imóvel</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInvoices?.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.contracts?.tenant_name || "-"}
                            </TableCell>
                            <TableCell>
                              {invoice.properties?.owner_name || "-"}
                            </TableCell>
                            <TableCell>
                              {invoice.contracts?.contract_number || "-"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {invoice.properties?.name || invoice.properties?.address}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.reference_month), "MMM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="font-semibold">
                              R$ {Number(invoice.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-sm">
                              {invoice.payment_method === "bank_transfer" ? "Transferência" : 
                               invoice.payment_method === "pix" ? "PIX" :
                               invoice.payment_method === "boleto" ? "Boleto" :
                               invoice.payment_method || "-"}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status, invoice.due_date)}
                            </TableCell>
                            <TableCell>
                              <Link to={`/faturas/${invoice.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          const distance = Math.abs(page - currentPage);
                          return distance === 0 || distance === 1 || page === 1 || page === totalPages;
                        })
                        .map((page, idx, arr) => {
                          if (idx > 0 && arr[idx - 1] !== page - 1) {
                            return [
                              <PaginationItem key={`ellipsis-${page}`}>
                                <span className="px-4">...</span>
                              </PaginationItem>,
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ];
                          }
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Receipt className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma fatura encontrada</h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Comece criando sua primeira fatura"}
                </p>
                <Link to="/faturas/nova">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Fatura
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
    </AppLayout>
  );
};

export default InvoicesList;
