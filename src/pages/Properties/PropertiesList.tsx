import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Building2, AlertCircle, ChevronRight, Filter, User, FileText, Eye, Globe, Trash2 } from "lucide-react";
import { PortalManagementDialog } from "@/components/Properties/PortalManagementDialog";
import { ImportPropertiesDialog } from "@/components/Properties/ImportPropertiesDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const PropertiesList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [portalDialogProperty, setPortalDialogProperty] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check for pending invoices
  const { data: pendingInvoices } = useQuery({
    queryKey: ["pending-invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id")
        .eq("status", "pending")
        .limit(1);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredProperties = properties?.filter((property) => {
    const matchesSearch =
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    
    const matchesOwner = !ownerFilter || 
      property.owner_name?.toLowerCase().includes(ownerFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesOwner;
  });

  const toggleSelectAll = () => {
    if (selectedProperties.length === filteredProperties?.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(filteredProperties?.map(p => p.id) || []);
    }
  };

  const toggleSelectProperty = (id: string) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("properties")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setSelectedProperties([]);
      setShowDeleteDialog(false);
      toast({ title: "Imóveis excluídos com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir imóveis",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      available: { variant: "default" as const, label: "Disponível" },
      rented: { variant: "secondary" as const, label: "Alugado" },
      maintenance: { variant: "outline" as const, label: "Manutenção" },
      unavailable: { variant: "destructive" as const, label: "Indisponível" },
    };

    return variants[status as keyof typeof variants] || variants.available;
  };

  return (
    <AppLayout title="Imóveis">
          {/* Pending Invoices Alert */}
          {pendingInvoices && pendingInvoices.length > 0 && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-semibold text-orange-800">Ops! Temos algumas faturas pendentes</span>
                  <p className="text-sm text-orange-700 mt-1">
                    Notamos que você possui faturas pendentes. Para continuar aproveitando todos os recursos da plataforma,
                    por favor, confira suas faturas. Seu acesso será temporariamente limitado até a regularização dos pagamentos.
                    Estamos aqui para ajudar!
                  </p>
                </div>
                <Link to="/faturas">
                  <Button variant="default" size="sm" className="ml-4 bg-blue-600 hover:bg-blue-700">
                    Clique aqui para ver as faturas
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link to="/" className="hover:text-gray-900">Locatto</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">Imóveis</span>
          </div>

          {/* Title and Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold">Imóveis e cadastramento</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ImportPropertiesDialog />
              {selectedProperties.length > 0 && (
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir ({selectedProperties.length})
                </Button>
              )}
              <Link to="/imoveis/novo" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar imóvel
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Disponibilidade
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("available")}>
                  Disponível
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("rented")}>
                  Alugado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("maintenance")}>
                  Manutenção
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("unavailable")}>
                  Indisponível
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative w-48">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Proprietário"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="pl-10"
                size={32}
              />
            </div>
          </div>

          {/* Select All Checkbox */}
          {filteredProperties && filteredProperties.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={selectedProperties.length === filteredProperties.length}
                onCheckedChange={toggleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Selecionar Todos
              </label>
            </div>
          )}

          {/* Properties Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-muted-foreground">Carregando imóveis...</p>
              </div>
            </div>
          ) : filteredProperties && filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProperties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {/* Checkbox */}
                    <div className="absolute top-3 left-3 z-10">
                      <Checkbox
                        checked={selectedProperties.includes(property.id)}
                        onCheckedChange={() => toggleSelectProperty(property.id)}
                        className="bg-white border-2"
                      />
                    </div>

                    {/* Property Image Placeholder */}
                    <div className="h-48 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-50 flex items-center justify-center relative overflow-hidden">
                      {/* Mountain illustration placeholder */}
                      <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 400 150" className="w-full opacity-30">
                          <path d="M0,150 L0,100 L50,60 L100,90 L150,50 L200,80 L250,40 L300,70 L350,50 L400,80 L400,150 Z" 
                                fill="url(#gradient)" />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#818cf8" />
                              <stop offset="100%" stopColor="#c084fc" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                      <Building2 className="h-16 w-16 text-blue-200 relative z-10" />
                    </div>

                    {/* Edit Icon */}
                    <Link 
                      to={`/imoveis/${property.id}/editar`}
                      className="absolute bottom-3 right-3 bg-white/90 hover:bg-white p-2 rounded-lg shadow-sm transition-all"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </Link>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Property Name */}
                      <h3 className="font-semibold text-base">{property.name}</h3>

                      {/* Status Badge */}
                      <Badge 
                        variant={getStatusBadge(property.status).variant}
                        className="text-xs"
                      >
                        {getStatusBadge(property.status).label}
                      </Badge>

                      {/* Owner Info */}
                      {property.owner_name && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-700 truncate max-w-[160px]">
                                {property.owner_name}
                              </span>
                              <span className="text-xs text-gray-500">Proprietário</span>
                            </div>
                          </div>
                          {/* You can add counter badge here if needed */}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Link to={`/imoveis/${property.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            Ver Imóvel
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setPortalDialogProperty(property)}>
                          <Globe className="mr-2 h-4 w-4" />
                          Anúncios
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum imóvel encontrado</h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Comece cadastrando seu primeiro imóvel"}
                </p>
                <Link to="/imoveis/novo">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Imóvel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

      {portalDialogProperty && (
        <PortalManagementDialog
          open={!!portalDialogProperty}
          onOpenChange={(open) => !open && setPortalDialogProperty(null)}
          property={portalDialogProperty}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedProperties.length} imóvel(is)? 
              Esta ação não pode ser desfeita. Contratos e faturas vinculados podem ser afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedProperties)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default PropertiesList;
