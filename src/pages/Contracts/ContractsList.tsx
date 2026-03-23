import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileCheck, MapPin, User, Eye, Calendar, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const ContractsList = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const dashboardFilter = searchParams.get("filter");

  // Set status filter from URL on mount
  useEffect(() => {
    if (dashboardFilter === "active") {
      setStatusFilter("active");
    }
  }, [dashboardFilter]);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          properties (
            *
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const toExportValue = (value: unknown) => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const exportContractsToExcel = () => {
    if (!contracts || contracts.length === 0) {
      toast.error("Nenhum contrato para exportar");
      return;
    }

    const rows = contracts.map((contract) => {
      const { properties, ...contractFields } = contract;
      const row: Record<string, string> = {};

      Object.entries(contractFields).forEach(([key, value]) => {
        row[`contrato_${key}`] = toExportValue(value);
      });

      if (properties && typeof properties === "object") {
        Object.entries(properties).forEach(([key, value]) => {
          row[`imovel_${key}`] = toExportValue(value);
        });
      }

      return row;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contratos");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `contratos-completo-${today}.xlsx`);
    toast.success("Exportação concluída com sucesso");
  };

  const filteredContracts = useMemo(() => {
    if (!contracts) return [];

    let result = contracts;

    // Apply dashboard-specific filters
    const now = new Date();
    if (dashboardFilter === "expiring30") {
      const in30 = addDays(now, 30);
      result = result.filter((c) => {
        if (c.status !== "active" || !c.end_date) return false;
        const end = new Date(c.end_date);
        return end >= now && end <= in30;
      });
    } else if (dashboardFilter === "expiring50") {
      const in30 = addDays(now, 30);
      const in50 = addDays(now, 50);
      result = result.filter((c) => {
        if (c.status !== "active" || !c.end_date) return false;
        const end = new Date(c.end_date);
        return end > in30 && end <= in50;
      });
    } else if (dashboardFilter === "readjustment") {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      result = result.filter((c) => {
        if (c.status !== "active") return false;
        return new Date(c.start_date) <= twelveMonthsAgo;
      });
    } else {
      // Standard filters when no dashboard filter
      const matchesStatus = (c: any) => statusFilter === "all" || c.status === statusFilter;
      result = result.filter(matchesStatus);
    }

    // Always apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.tenant_name.toLowerCase().includes(term) ||
          c.properties?.name?.toLowerCase().includes(term) ||
          c.contract_number?.toLowerCase().includes(term) ||
          c.tenant_document?.toLowerCase().includes(term) ||
          c.tenant_phone?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [contracts, dashboardFilter, statusFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, label: "Ativo", color: "bg-green-500" },
      expired: { variant: "secondary" as const, label: "Vencido", color: "bg-gray-500" },
      cancelled: { variant: "destructive" as const, label: "Cancelado", color: "bg-red-500" },
    };

    return variants[status as keyof typeof variants] || variants.active;
  };

  const filterLabels: Record<string, string> = {
    expiring30: "Contratos vencendo em até 30 dias",
    expiring50: "Contratos vencendo entre 31 e 50 dias",
    readjustment: "Contratos pendentes de reajuste",
    active: "Contratos ativos",
  };

  return (
    <AppLayout title="Contratos">
          {dashboardFilter && filterLabels[dashboardFilter] && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {filterLabels[dashboardFilter]}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchParams({});
                  setStatusFilter("all");
                }}
              >
                Limpar filtro
              </Button>
            </div>
          )}
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por inquilino ou imóvel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="expired">Vencido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Link to="/contratos/novo">
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo Contrato
              </Button>
            </Link>

            <Button variant="outline" className="w-full md:w-auto" onClick={exportContractsToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>

          {/* Contracts List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-muted-foreground">Carregando contratos...</p>
              </div>
            </div>
          ) : filteredContracts && filteredContracts.length > 0 ? (
            <div className="space-y-4">
              {filteredContracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="rounded-lg bg-blue-50 p-3">
                            <FileCheck className="h-6 w-6 text-blue-600" />
                          </div>

                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold">{contract.tenant_name}</h3>
                                <Badge variant={getStatusBadge(contract.status).variant}>
                                  {getStatusBadge(contract.status).label}
                                </Badge>
                              </div>
                              {contract.contract_number && (
                                <p className="text-sm text-gray-500">Contrato: {contract.contract_number}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div className="text-sm">
                                  <p className="font-medium text-gray-700">{contract.properties?.name}</p>
                                  <p className="text-gray-500">
                                    {contract.properties?.address} - {contract.properties?.city}/{contract.properties?.state}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <Calendar className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div className="text-sm">
                                  <p className="font-medium text-gray-700">Vigência</p>
                                  <p className="text-gray-500">
                                    {new Date(contract.start_date).toLocaleDateString()} até{" "}
                                    {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "Indeterminado"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <User className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div className="text-sm">
                                  <p className="font-medium text-gray-700">Aluguel Mensal</p>
                                  <p className="text-lg font-bold text-green-600">
                                    R$ {Number(contract.rental_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Link to={`/contratos/${contract.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileCheck className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum contrato encontrado</h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Comece criando seu primeiro contrato de locação"}
                </p>
                <Link to="/contratos/novo">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Contrato
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
    </AppLayout>
  );
};

export default ContractsList;
