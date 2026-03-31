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
import { Plus, Search, Receipt, DollarSign, AlertCircle, Zap, Calendar as CalendarIcon, FileSpreadsheet, Mail, MessageCircle, Copy, ChevronLeft, ChevronRight, SlidersHorizontal, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvoiceCard } from "@/components/Responsive/InvoiceCard";
import { FilterDrawer } from "@/components/Filters/FilterDrawer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { GenerateInvoiceDialog } from "@/components/Invoices/GenerateInvoiceDialog";
import { ImportInvoiceDetailsDialog } from "@/components/Invoices/ImportInvoiceDetailsDialog";
import { AjustarFaturasDialog } from "@/components/Invoices/AjustarFaturasDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRangePicker, DateFilterField } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

const ITEMS_PER_PAGE_OPTIONS = [50, 100, 200];

const InvoicesList = () => {
  const { user } = useAuth();
  const { accountId, loading: accountLoading } = useAccountId();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [referenceMonth, setReferenceMonth] = useState<Date>(new Date());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [ajustarDialogOpen, setAjustarDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateField, setDateField] = useState<DateFilterField>("due_date");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<any[]>([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);

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

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setSelectedInvoices([]);
      toast({
        title: `${count} fatura(s) excluída(s)`,
        description: "As faturas selecionadas foram removidas permanentemente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir faturas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const loadCleanupPreview = async () => {
    setCleanupLoading(true);
    try {
      // Busca faturas que não possuem contrato ativo
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, reference_month, due_date, total_amount, status,
          contracts (id, contract_number, tenant_name, status)
        `)
        .eq(filterColumn, filterValue)
        .order("due_date", { ascending: true });

      if (error) throw error;

      const orphans = (data || []).filter((inv: any) => {
        const contractStatus = inv.contracts?.status;
        // Inclui: sem contrato, ou contrato encerrado/expirado/cancelado
        return !contractStatus || 
          contractStatus === "terminated" ||
          contractStatus === "expired" ||
          contractStatus === "encerrado";
      });

      setCleanupPreview(orphans);
      setCleanupDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar prévia",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  const deleteCleanupMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setCleanupDialogOpen(false);
      setCleanupPreview([]);
      toast({
        title: `Limpeza concluída`,
        description: `${count} fatura(s) antiga(s) excluída(s) com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir faturas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
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

    const matchesStatus = statusFilter === "all" 
      ? true 
      : (statusFilter === "pending" 
        ? (invoice.status === "pending" || invoice.status === "overdue") 
        : invoice.status === statusFilter);
    const matchesPaymentMethod = paymentMethodFilter === "all" || invoice.payment_method === paymentMethodFilter;
    const matchesContract = !contractFilter || 
      invoice.contracts?.contract_number?.toLowerCase().includes(contractFilter.toLowerCase()) ||
      invoice.contracts?.tenant_name?.toLowerCase().includes(contractFilter.toLowerCase());
    const matchesOwner = !ownerFilter || invoice.properties?.owner_name?.toLowerCase().includes(ownerFilter.toLowerCase());

    // Date range filter
    let matchesDateRange = true;
    if (dateRange?.from) {
      let dateToCompare: Date | null = null;
      
      if (dateField === "due_date" && invoice.due_date) {
        dateToCompare = parseISO(invoice.due_date);
      } else if (dateField === "reference_month" && invoice.reference_month) {
        // reference_month is YYYY-MM format, compare by month range
        const [year, month] = invoice.reference_month.split("-").map(Number);
        const refMonthStart = startOfMonth(new Date(year, month - 1));
        const refMonthEnd = endOfMonth(new Date(year, month - 1));
        // Check if reference month overlaps with selected range
        const rangeEnd = dateRange.to || dateRange.from;
        matchesDateRange = refMonthStart <= rangeEnd && refMonthEnd >= dateRange.from;
      } else if (dateField === "payment_date" && invoice.payment_date) {
        dateToCompare = parseISO(invoice.payment_date);
      } else if (dateField === "payment_date" && !invoice.payment_date) {
        // No payment date, exclude from payment_date filter
        matchesDateRange = false;
      }
      
      if (dateToCompare && dateField !== "reference_month") {
        const rangeEnd = dateRange.to || dateRange.from;
        matchesDateRange = isWithinInterval(dateToCompare, {
          start: dateRange.from,
          end: rangeEnd,
        });
      }
    }

    return matchesSearch && matchesStatus && matchesPaymentMethod && matchesContract && matchesOwner && matchesDateRange;
  });

  // Status counts (before status filter)
  const statusCounts = invoices?.reduce((acc, invoice) => {
    // Apply all filters except status
    const matchesSearch =
      invoice.contracts?.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.properties?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.properties?.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.contracts?.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPaymentMethod = paymentMethodFilter === "all" || invoice.payment_method === paymentMethodFilter;
    const matchesContract = !contractFilter || 
      invoice.contracts?.contract_number?.toLowerCase().includes(contractFilter.toLowerCase()) ||
      invoice.contracts?.tenant_name?.toLowerCase().includes(contractFilter.toLowerCase());
    const matchesOwner = !ownerFilter || invoice.properties?.owner_name?.toLowerCase().includes(ownerFilter.toLowerCase());
    
    if (matchesSearch && matchesPaymentMethod && matchesContract && matchesOwner) {
      acc[invoice.status] = (acc[invoice.status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const paginatedInvoices = filteredInvoices?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil((filteredInvoices?.length || 0) / itemsPerPage);

  // Total of filtered invoices
  const filteredTotal = filteredInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(paginatedInvoices?.map(inv => inv.id) || []);
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, id]);
    } else {
      setSelectedInvoices(prev => prev.filter(i => i !== id));
    }
  };

  const isAllSelected = paginatedInvoices?.length > 0 && paginatedInvoices?.every(inv => selectedInvoices.includes(inv.id));

  const getStatusBadge = (status: string, dueDate: string) => {
    const variants = {
      paid: { variant: "default" as const, label: "Pago", icon: null },
      pending: { variant: "secondary" as const, label: "Pendente", icon: null },
      overdue: { variant: "destructive" as const, label: "Vencida", icon: AlertCircle },
      cancelled: { variant: "outline" as const, label: "Cancelada", icon: null },
      judicial: { variant: "destructive" as const, label: "Cobrança Judicial", icon: null },
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

  return (
    <AppLayout title="Faturas">
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

              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Importar Detalhes
              </Button>

              <Button variant="outline" onClick={() => setAjustarDialogOpen(true)}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Ajustar Faturas
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={loadCleanupPreview}
                    disabled={cleanupLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {cleanupLoading ? "Analisando..." : "Limpeza de Faturas"}
                  </Button>
                </AlertDialogTrigger>
              </AlertDialog>

              <Link to="/faturas/nova">
                <Button className="w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Fatura Manual
                </Button>
              </Link>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex flex-col md:flex-row gap-4 flex-wrap">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                dateField={dateField}
                onDateFieldChange={setDateField}
              />

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
                placeholder="Filtrar por nº contrato ou inquilino..."
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="w-full md:w-[220px]"
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
              setDateRange(undefined);
            }}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Filtrar por Data</label>
                <Select value={dateField} onValueChange={(value) => setDateField(value as DateFilterField)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tipo de data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_date">Dt. Vencimento</SelectItem>
                    <SelectItem value="reference_month">Dt. Competência</SelectItem>
                    <SelectItem value="payment_date">Dt. Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                placeholder="Filtrar por nº contrato ou inquilino..."
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

          {/* Bulk delete bar */}
          {selectedInvoices.length > 0 && (
            <div className="flex items-center justify-between bg-muted border rounded-lg px-4 py-2 mb-4">
              <span className="text-sm font-medium">{selectedInvoices.length} fatura(s) selecionada(s)</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Selecionadas
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedInvoices.length} fatura(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é permanente e não pode ser desfeita. As faturas excluídas não poderão ser recuperadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => deleteSelectedMutation.mutate(selectedInvoices)}
                      disabled={deleteSelectedMutation.isPending}
                    >
                      {deleteSelectedMutation.isPending ? "Excluindo..." : "Confirmar Exclusão"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Invoices Display */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-muted-foreground">Carregando faturas...</p>
              </div>
            </div>
          ) : invoices && invoices.length > 0 ? (
            <>
              {/* Status Tabs */}
              <div className="flex items-center gap-4 mb-4 border-b overflow-x-auto pb-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                    statusFilter === "all" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Todas
                  <Badge variant="secondary" className="ml-1">
                    {invoices.length}
                  </Badge>
                </button>
                <button
                  onClick={() => setStatusFilter("paid")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                    statusFilter === "paid" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pago
                  <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary">
                    {statusCounts.paid || 0}
                  </Badge>
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                    statusFilter === "pending" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pendente
                  <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                    {(statusCounts.pending || 0) + (statusCounts.overdue || 0)}
                  </Badge>
                </button>
                <button
                  onClick={() => setStatusFilter("cancelled")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                    statusFilter === "cancelled" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Cancelado
                  <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-800">
                    {statusCounts.cancelled || 0}
                  </Badge>
                </button>
                <button
                  onClick={() => setStatusFilter("judicial")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                    statusFilter === "judicial" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Cobrança Judicial
                  <Badge variant="secondary" className="ml-1 bg-red-100 text-red-800">
                    {statusCounts.judicial || 0}
                  </Badge>
                </button>
              </div>

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
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[50px]">
                            <Checkbox 
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Proprietário</TableHead>
                          <TableHead>Contrato</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Forma de Pagamento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInvoices?.map((invoice) => (
                          <TableRow 
                            key={invoice.id}
                            className={cn(
                              selectedInvoices.includes(invoice.id) && "bg-muted/50"
                            )}
                          >
                            <TableCell>
                              <Checkbox 
                                checked={selectedInvoices.includes(invoice.id)}
                                onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {invoice.contracts?.tenant_email && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => window.location.href = `mailto:${invoice.contracts?.tenant_email}`}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                )}
                                {invoice.contracts?.tenant_phone && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-green-500"
                                    onClick={() => {
                                      const phone = invoice.contracts?.tenant_phone?.replace(/\D/g, '');
                                      window.open(`https://wa.me/55${phone}`, '_blank');
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {invoice.contracts?.tenant_name || "-"}
                            </TableCell>
                            <TableCell>
                              {invoice.properties?.owner_name || "-"}
                            </TableCell>
                            <TableCell>
                              <span className="text-primary">
                                Contrato #{invoice.contracts?.contract_number || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {Number(invoice.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {`${invoice.reference_month.slice(5, 7)}/${invoice.reference_month.slice(0, 4)}`}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>
                              {invoice.payment_method === "bank_transfer" ? "Transferência Bancária" : 
                               invoice.payment_method === "pix" ? "PIX" :
                               invoice.payment_method === "boleto" ? "Boleto" :
                               invoice.payment_method || "-"}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status, invoice.due_date)}
                            </TableCell>
                            <TableCell>
                              <Link to={`/faturas/${invoice.id}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Table Footer with Total */}
                  <div className="border-t px-6 py-3 flex justify-end">
                    <span className="text-sm text-muted-foreground">
                      Total das faturas exibidas:{" "}
                      <span className="font-semibold text-foreground">
                        R$ {filteredTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Por página:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>{filteredInvoices?.length || 0} registros encontrados.</span>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        const distance = Math.abs(page - currentPage);
                        return distance === 0 || distance === 1 || page === 1 || page === totalPages;
                      })
                      .map((page, idx, arr) => {
                        const items = [];
                        if (idx > 0 && arr[idx - 1] !== page - 1) {
                          items.push(
                            <span key={`ellipsis-${page}`} className="px-2 text-muted-foreground">...</span>
                          );
                        }
                        items.push(
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                        return items;
                      })}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
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

          {/* Import Dialog */}
          <ImportInvoiceDetailsDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
          />
          <AjustarFaturasDialog
            open={ajustarDialogOpen}
            onOpenChange={setAjustarDialogOpen}
          />

          {/* Cleanup Dialog */}
          <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
            <AlertDialogContent className="max-w-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Limpeza de Faturas Antigas
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      Foram encontradas <strong>{cleanupPreview.length}</strong> fatura(s) vinculadas a contratos encerrados ou sem contrato ativo.
                    </p>
                    {cleanupPreview.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto border rounded-lg divide-y text-sm">
                        {cleanupPreview.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between px-3 py-2">
                            <div>
                              <span className="font-medium">{inv.invoice_number || "Sem número"}</span>
                              <span className="text-muted-foreground ml-2">
                                {inv.contracts?.tenant_name || "Sem inquilino"}
                                {inv.contracts?.status && (
                                  <span className="ml-1 text-xs">({inv.contracts.status})</span>
                                )}
                              </span>
                            </div>
                            <div className="text-right text-muted-foreground text-xs">
                              <div>{`${inv.reference_month.slice(5, 7)}/${inv.reference_month.slice(0, 4)}`}</div>
                              <div>R$ {Number(inv.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-green-600 font-medium">Nenhuma fatura órfã encontrada. Tudo limpo!</p>
                    )}
                    {cleanupPreview.length > 0 && (
                      <p className="text-destructive text-sm font-medium">
                        Esta ação é permanente e não pode ser desfeita.
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Fechar</AlertDialogCancel>
                {cleanupPreview.length > 0 && (
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => deleteCleanupMutation.mutate(cleanupPreview.map(inv => inv.id))}
                    disabled={deleteCleanupMutation.isPending}
                  >
                    {deleteCleanupMutation.isPending
                      ? "Excluindo..."
                      : `Excluir ${cleanupPreview.length} fatura(s)`}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
    </AppLayout>
  );
};

export default InvoicesList;
