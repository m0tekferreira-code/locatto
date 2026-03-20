import { useState, useMemo } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  FileText, 
  AlertCircle, 
  Calendar, 
  Receipt, 
  Home,
  Download,
  FileSpreadsheet,
  Filter
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// An invoice is overdue when its status is 'overdue' (set by DB trigger) or still
// pending past its due date.
const isOverdue = (invoice: { status: string; due_date: string }) =>
  invoice.status === "overdue" ||
  (invoice.status === "pending" && new Date(invoice.due_date) < new Date());

// Resolve the property id from the invoice directly or through its contract.
const getInvoicePropertyId = (invoice: {
  property_id?: string | null;
  contracts?: { property_id?: string | null } | null;
}) => invoice.property_id ?? invoice.contracts?.property_id ?? null;

const getDateRange = (period: string): { start: Date | null; end: Date | null } => {
  const now = new Date();
  if (period === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }
  if (period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    return {
      start: new Date(now.getFullYear(), quarter * 3, 1),
      end: new Date(now.getFullYear(), quarter * 3 + 3, 0),
    };
  }
  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
    };
  }
  return { start: null, end: null };
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "paid": return "Pago";
    case "pending": return "Pendente";
    case "overdue": return "Vencida";
    case "cancelled": return "Cancelada";
    default: return status;
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "paid": return "default";
    case "pending": return "secondary";
    case "overdue": return "destructive";
    case "cancelled": return "outline";
    default: return "outline";
  }
};

const ReportsList = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState("all");

  // Fetch properties
  const { data: properties } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch contracts
  const { data: contracts } = useQuery({
    queryKey: ["contracts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          properties (
            name,
            address
          )
        `)
;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch invoices
  const { data: invoices } = useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          properties (
            id,
            name,
            address
          ),
          contracts (
            id,
            property_id,
            tenant_name,
            rental_value
          )
        `)
        ;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Apply period and property filters to invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    const { start, end } = getDateRange(period);
    return invoices.filter((inv) => {
      if (selectedProperty !== "all" && getInvoicePropertyId(inv) !== selectedProperty) return false;
      if (start && end) {
        const due = new Date(inv.due_date);
        if (due < start || due > end) return false;
      }
      return true;
    });
  }, [invoices, period, selectedProperty]);

  // Overdue invoices: pending past due-date OR already in legal collection
  const overdueInvoices = useMemo(
    () => filteredInvoices.filter(isOverdue),
    [filteredInvoices]
  );

  // Calculate financial metrics from filtered invoices
  const financialMetrics = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, invoice) => {
        const amount = Number(invoice.total_amount);
        if (invoice.status === "paid") {
          acc.totalPaid += amount;
          acc.totalRevenue += amount;
        } else if (invoice.status === "pending" || invoice.status === "overdue") {
          acc.totalPending += amount;
          if (isOverdue(invoice)) {
            acc.totalOverdue += amount;
          }
        }
        return acc;
      },
      { totalRevenue: 0, totalPaid: 0, totalPending: 0, totalOverdue: 0 }
    );
  }, [filteredInvoices]);

  const inadimplenceRate =
    financialMetrics.totalPaid + financialMetrics.totalPending > 0
      ? (
          (financialMetrics.totalOverdue /
            (financialMetrics.totalPaid + financialMetrics.totalPending)) *
          100
        ).toFixed(1)
      : "0.0";

  // Contract metrics
  const activeContracts = contracts?.filter(c => c.status === "active").length || 0;
  const expiredContracts = contracts?.filter(c => c.status === "expired").length || 0;

  const reportTypes = [
    {
      id: "financeiro",
      nome: "Financeiro",
      descricao: "Resumo de receitas, despesas, saldo, inadimplência, valores pagos e pendentes",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      id: "contratos",
      nome: "Contratos",
      descricao: "Status dos contratos: ativos, vencidos, próximos vencimentos, valor e vigência",
      icon: FileText,
      color: "text-blue-600"
    },
    {
      id: "inadimplencia",
      nome: "Inadimplência",
      descricao: "Relação de faturas atrasadas, cobrança, perfil de devedores e ações tomadas",
      icon: AlertCircle,
      color: "text-red-600"
    },
    {
      id: "faturas",
      nome: "Faturas",
      descricao: "Listagem das faturas emitidas, pagas, pendentes, canceladas por período e imóvel",
      icon: Receipt,
      color: "text-purple-600"
    },
    {
      id: "imoveis",
      nome: "Imóveis",
      descricao: "Resumo dos imóveis cadastrados, ocupação, disponibilidade e histórico",
      icon: Home,
      color: "text-orange-600"
    }
  ];

  return (
    <AppLayout title="Relatórios">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Imóvel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os imóveis</SelectItem>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>

          {/* Report Types */}
          <Tabs defaultValue="financeiro" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              {reportTypes.map((type) => (
                <TabsTrigger key={type.id} value={type.id}>
                  <type.icon className="mr-2 h-4 w-4" />
                  {type.nome}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Financial Report */}
            <TabsContent value="financeiro" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Receita Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      R$ {financialMetrics.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Recebido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      R$ {financialMetrics.totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Em Aberto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      R$ {financialMetrics.totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Inadimplência</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {inadimplenceRate}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Receitas por Imóvel</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imóvel</TableHead>
                        <TableHead>Receita</TableHead>
                        <TableHead>Faturas Atrasadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties
                        ?.filter(p => selectedProperty === "all" || p.id === selectedProperty)
                        .map((property) => {
                          const propertyInvoices = filteredInvoices.filter(i => getInvoicePropertyId(i) === property.id);
                          const revenue = propertyInvoices
                            .filter(inv => inv.status === "paid")
                            .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
                          const overdueCount = propertyInvoices.filter(isOverdue).length;

                          return (
                            <TableRow key={property.id}>
                              <TableCell className="font-medium">{property.name}</TableCell>
                              <TableCell>R$ {revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell>
                                {overdueCount > 0 ? (
                                  <Badge variant="destructive">{overdueCount}</Badge>
                                ) : (
                                  <Badge variant="default">0</Badge>
                                )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contracts Report */}
            <TabsContent value="contratos" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Contratos Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{activeContracts}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Contratos Vencidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{expiredContracts}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Situação dos Contratos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imóvel / Contrato</TableHead>
                        <TableHead>Inquilino</TableHead>
                        <TableHead>Vigência</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts
                        ?.filter(c => c.status === "active")
                        .filter(c => selectedProperty === "all" || c.property_id === selectedProperty)
                        .map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            {contract.properties?.name || contract.contract_number || "—"}
                          </TableCell>
                          <TableCell>{contract.tenant_name}</TableCell>
                          <TableCell>
                            {new Date(contract.start_date).toLocaleDateString("pt-BR")} - {" "}
                            {contract.end_date ? new Date(contract.end_date).toLocaleDateString("pt-BR") : "Indeterminado"}
                          </TableCell>
                          <TableCell>
                            R$ {Number(contract.rental_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {contracts?.filter(c => c.status === "active").length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum contrato ativo encontrado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Overdue Report */}
            <TabsContent value="inadimplencia" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Faturas Atrasadas</CardTitle>
                  <CardDescription>Relação de cobranças pendentes com vencimento ultrapassado</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imóvel</TableHead>
                        <TableHead>Inquilino</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Dias em Atraso</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueInvoices.map((invoice) => {
                          const daysOverdue = Math.max(
                            0,
                            Math.floor(
                              (new Date().getTime() - new Date(invoice.due_date).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          );
                          const tenantName = invoice.contracts?.tenant_name ?? "—";
                          // Resolve property name: direct relation or look up via contract's property_id
                          const contractPropertyId = invoice.contracts?.property_id;
                          const propertyName =
                            invoice.properties?.name ??
                            (contractPropertyId
                              ? properties?.find(p => p.id === contractPropertyId)?.name
                              : undefined) ??
                            "—";

                          return (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">{propertyName}</TableCell>
                              <TableCell>{tenantName}</TableCell>
                              <TableCell>
                                {new Date(invoice.due_date).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-red-600 font-semibold">
                                R$ {Number(invoice.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">{daysOverdue} dias</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(invoice.status)}>
                                  {getStatusLabel(invoice.status)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                  {overdueInvoices.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma fatura atrasada encontrada
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Report */}
            <TabsContent value="faturas" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Emitidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{filteredInvoices.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Pagas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {filteredInvoices.filter(i => i.status === "paid").length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {filteredInvoices.filter(i => i.status === "pending" || i.status === "overdue").length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Faturas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imóvel</TableHead>
                        <TableHead>Inquilino</TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => {
                        const contractPropertyId = invoice.contracts?.property_id;
                        const propertyName =
                          invoice.properties?.name ??
                          (contractPropertyId
                            ? properties?.find(p => p.id === contractPropertyId)?.name
                            : undefined) ??
                          "—";
                        const tenantName = invoice.contracts?.tenant_name ?? "—";

                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{propertyName}</TableCell>
                            <TableCell>{tenantName}</TableCell>
                            <TableCell>
                              {new Date(invoice.reference_month).toLocaleDateString("pt-BR", {
                                month: "2-digit",
                                year: "numeric"
                              })}
                            </TableCell>
                            <TableCell>
                              {new Date(invoice.due_date).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              R$ {Number(invoice.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(invoice.status)}>
                                {getStatusLabel(invoice.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Properties Report */}
            <TabsContent value="imoveis" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total de Imóveis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{properties?.length || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Ocupados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {properties?.filter(p => p.status === "rented").length || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Disponíveis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {properties?.filter(p => p.status === "available").length || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Status dos Imóveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imóvel</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Valor do Aluguel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties
                        ?.filter(p => selectedProperty === "all" || p.id === selectedProperty)
                        .map((property) => {
                          const contract = contracts?.find(c => c.property_id === property.id && c.status === "active");
                        
                        return (
                          <TableRow key={property.id}>
                            <TableCell className="font-medium">{property.name}</TableCell>
                            <TableCell>{property.property_type}</TableCell>
                            <TableCell>
                              <Badge variant={property.status === "rented" ? "default" : "secondary"}>
                                {property.status === "available" ? "Disponível" : 
                                 property.status === "rented" ? "Ocupado" : property.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {contract ? 
                                `R$ ${Number(contract.rental_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` 
                                : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
    </AppLayout>
  );
};

export default ReportsList;
