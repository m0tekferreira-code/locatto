import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, 
  FilePlus, 
  Paperclip, 
  Settings2,
  FileSignature,
  Home,
  Building2,
  User,
  Calendar,
  Eye,
  Upload,
  Trash2,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ImportContractDocsDialog } from "@/components/Contracts/ImportContractDocsDialog";
import * as XLSX from "xlsx";

const contractTemplates = [
  "Contrato de Prestação de Serviços de Corretagem Imobiliária",
  "Contrato de locação de garagem – título de capitalização",
  "Recibo de Chaves e Rescisão Provisória",
  "Distrato de contrato de locação",
  "Locação de Imóvel Residencial",
  "Termo de Rescisão de Contrato de Locação",
  "Contrato de Comodato",
  "Contrato particular de promessa de compra e venda – À vista",
  "Contrato de Locação por temporada",
  "Contrato de sublocação de imóvel residencial/comercial",
];

// Descrições dos templates
const getTemplateDescription = (template: string): string => {
  const descriptions: Record<string, string> = {
    "Contrato de Prestação de Serviços de Corretagem Imobiliária": "Para formalizar serviços de corretagem entre imobiliárias e clientes",
    "Contrato de locação de garagem – título de capitalização": "Locação de espaço para estacionamento com título de capitalização como garantia",
    "Recibo de Chaves e Rescisão Provisória": "Documento para entrega de chaves e rescisão temporária de contrato",
    "Distrato de contrato de locação": "Acordo formal para encerramento de contrato de locação",
    "Locação de Imóvel Residencial": "Contrato padrão para locação de imóveis residenciais",
    "Termo de Rescisão de Contrato de Locação": "Documento formal para finalizar contrato de locação",
    "Contrato de Comodato": "Empréstimo gratuito de imóvel por tempo determinado",
    "Contrato particular de promessa de compra e venda – À vista": "Compromisso de compra e venda com pagamento integral à vista",
    "Contrato de Locação por temporada": "Para locações de curta duração, ideais para férias",
    "Contrato de sublocação de imóvel residencial/comercial": "Permite ao locatário sublocar o imóvel a terceiros",
  };
  return descriptions[template] || "Template de contrato profissional";
};

const DocumentsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [importDocsOpen, setImportDocsOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleDeleteContract = async (contractId: string, documents: any[]) => {
    if (!confirm("Deseja excluir este contrato e todos os documentos anexados?")) return;
    setDeleting(contractId);
    try {
      // Remove files from storage
      if (documents && documents.length > 0) {
        const paths = documents.map((d: any) => d.path).filter(Boolean);
        if (paths.length > 0) {
          await supabase.storage.from("contract-documents").remove(paths);
        }
      }
      // Delete contract record
      const { error } = await supabase.from("contracts").delete().eq("id", contractId);
      if (error) throw error;
      toast.success("Contrato excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const { data: contracts = [], isLoading } = useQuery({
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
      return data || [];
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

  const activeContracts = contracts.filter(c => c.status === "active");
  const closedContracts = contracts.filter(c => c.status !== "active");

  const filteredContracts = (list: typeof contracts) => {
    const normalizeContractSearch = (value?: string | null) =>
      (value || "").toLowerCase().replace(/#/g, "").replace(/\s+/g, "").trim();

    return list.filter(contract => {
      const term = searchTerm.toLowerCase();
      const normalizedTerm = normalizeContractSearch(searchTerm);
      const normalizedContractNumber = normalizeContractSearch(contract.contract_number);
      const matchesSearch = searchTerm === "" || 
        contract.tenant_name?.toLowerCase().includes(term) ||
        contract.contract_number?.toLowerCase().includes(term) ||
        (normalizedTerm !== "" && normalizedContractNumber.includes(normalizedTerm)) ||
        contract.tenant_document?.toLowerCase().includes(term) ||
        contract.tenant_email?.toLowerCase().includes(term) ||
        contract.tenant_phone?.includes(term) ||
        contract.properties?.name?.toLowerCase().includes(term) ||
        contract.properties?.address?.toLowerCase().includes(term) ||
        contract.properties?.city?.toLowerCase().includes(term) ||
        contract.properties?.neighborhood?.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
      const matchesType = typeFilter === "all"; // Can be extended later
      
      return matchesSearch && matchesStatus && matchesType;
    });
  };

  return (
    <AppLayout title="Documentos">
      <div className="max-w-7xl mx-auto space-y-6">
            <Tabs defaultValue="contratos" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="contratos">Contratos</TabsTrigger>
                <TabsTrigger value="encerrados">Contratos Encerrados</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
              </TabsList>

              <TabsContent value="contratos" className="space-y-6 mt-6">
                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <FileSignature className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="text-base">Criar novo Contrato ou Acordo</CardTitle>
                      <CardDescription className="text-xs">
                        Utilizado para cobranças fixas ou parceladas
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <FilePlus className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="text-base">Novo Documento</CardTitle>
                      <CardDescription className="text-xs">
                        Para documentos relativos ao imóvel ou procurações
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Paperclip className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="text-base">Anexar documento</CardTitle>
                      <CardDescription className="text-xs">
                        Somente para guardar documentos do imóvel
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setImportDocsOpen(true)}>
                    <CardHeader>
                      <Upload className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="text-base">Importar PDFs em lote</CardTitle>
                      <CardDescription className="text-xs">
                        Upload massivo de contratos PDF vinculados por número
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                {/* Contract Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle>Criar a partir de um modelo de contrato</CardTitle>
                    <CardDescription>Escolha um template para criar seu contrato rapidamente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Carousel
                      opts={{
                        align: "start",
                        loop: false,
                      }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-4">
                        {contractTemplates.map((template, index) => (
                          <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                            <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary">
                              <CardHeader className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-primary" />
                                  </div>
                                </div>
                                <div>
                                  <CardTitle className="text-base leading-tight mb-2">
                                    {template}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {getTemplateDescription(template)}
                                  </CardDescription>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <Button variant="outline" className="w-full" size="sm">
                                  Usar Template
                                </Button>
                              </CardContent>
                            </Card>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <CarouselPrevious />
                        <CarouselNext />
                      </div>
                    </Carousel>
                  </CardContent>
                </Card>

                {/* Filters */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle>Ver Contratos</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportContractsToExcel}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Input
                        placeholder="Pesquisar por contrato (ex: #10610)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Situação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="active">Vigente</SelectItem>
                          <SelectItem value="expired">Vencido</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="rental">Locação</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Proprietário" />
                    </div>

                    {/* Contracts List */}
                    <div className="space-y-4 mt-6">
                      {isLoading ? (
                        <p className="text-center text-muted-foreground">Carregando...</p>
                      ) : filteredContracts(activeContracts).length === 0 ? (
                        <p className="text-center text-muted-foreground">Nenhum contrato encontrado</p>
                      ) : (
                        filteredContracts(activeContracts).map((contract) => (
                          <Card key={contract.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="space-y-4 flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-lg">
                                          # {contract.contract_number || contract.id.slice(0, 8)}
                                        </h3>
                                        <Badge variant="secondary">Contrato de Locação</Badge>
                                        <Badge className="bg-green-500 hover:bg-green-600">
                                          Vigente
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Dt. Início:</span>
                                        <span className="font-medium">
                                          {new Date(contract.start_date).toLocaleDateString("pt-BR")}
                                        </span>
                                      </div>
                                      {contract.end_date && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-muted-foreground">Dt. Término:</span>
                                          <span className="font-medium">
                                            {new Date(contract.end_date).toLocaleDateString("pt-BR")}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {contract.properties ? (
                                      <div className="flex items-start gap-2 text-sm">
                                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div>
                                          <p className="text-muted-foreground">Imóvel:</p>
                                          <p className="font-medium">{contract.properties.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {contract.properties.address}{contract.properties.neighborhood ? `, ${contract.properties.neighborhood}` : ""} - {contract.properties.city}/{contract.properties.state}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2 text-sm">
                                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div>
                                          <p className="text-muted-foreground">Imóvel:</p>
                                          <p className="text-xs text-muted-foreground italic">Nenhum imóvel vinculado</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                                    <div className="flex items-start gap-2 text-sm">
                                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-muted-foreground">Inquilino:</p>
                                        <p className="font-medium">{contract.tenant_name}</p>
                                        {contract.tenant_email && (
                                          <p className="text-xs text-muted-foreground">
                                            {contract.tenant_email}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => navigate(`/contratos/${contract.id}`)}
                                    className="whitespace-nowrap"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive whitespace-nowrap"
                                    disabled={deleting === contract.id}
                                    onClick={() => handleDeleteContract(contract.id, (contract as any).documents || [])}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {deleting === contract.id ? "Excluindo..." : "Excluir"}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="encerrados" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contratos Encerrados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {closedContracts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum contrato encerrado encontrado
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {closedContracts.map((contract) => (
                          <Card key={contract.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{contract.tenant_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {contract.properties?.name}
                                  </p>
                                </div>
                                <Badge variant="secondary">{contract.status}</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documentos" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Documentos</CardTitle>
                    <CardDescription>
                      Gerencie documentos relacionados aos seus imóveis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground py-8">
                      Funcionalidade em desenvolvimento
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
      </div>

      <ImportContractDocsDialog
        open={importDocsOpen}
        onOpenChange={setImportDocsOpen}
      />
    </AppLayout>
  );
};

export default DocumentsList;
