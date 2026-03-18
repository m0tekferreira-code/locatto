import { useParams, Link, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header, SidebarAvailableContext } from "@/components/Layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ScheduleVisitDialog } from "@/components/Properties/ScheduleVisitDialog";
import { LinkedPersonsDialog } from "@/components/Properties/LinkedPersonsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Edit, FileText, Trash2, MapPin, Building2, Calendar, User, Phone, Mail, 
  FileCheck, AlertCircle, Image, Camera, Home, DollarSign, Clock, 
  Shield, TrendingUp, Upload, Eye, UserPlus, Briefcase, Settings, Star
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  // Refs para inputs de arquivo
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para arquivos selecionados
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<File[]>([]);
  
  // Estados para dialogs
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [personsDialogOpen, setPersonsDialogOpen] = useState(false);
  
  // Estados para drag and drop
  const [isPhotosDragging, setIsPhotosDragging] = useState(false);
  const [isDocsDragging, setIsDocsDragging] = useState(false);
  
  // Estados para preview de PDF
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>("");
  const [selectedPdfName, setSelectedPdfName] = useState<string>("");
  
  // Estados para Google Calendar
  const [calendarUrl, setCalendarUrl] = useState<string>("");
  const [tempCalendarUrl, setTempCalendarUrl] = useState<string>("");
  const [calendarConfigOpen, setCalendarConfigOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: contracts } = useQuery({
    queryKey: ["property-contracts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("property_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["property-invoices", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("property_id", id)
        .order("due_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const activeContract = contracts?.find(c => c.status === "active");
  const pendingInvoices = invoices?.filter(inv => inv.status === "pending") || [];
  
  // Buscar usuário autenticado e configuração do calendar
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchCalendarConfig(user.id);
      }
    };
    fetchUser();
  }, []);

  const fetchCalendarConfig = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("google_calendar_embed_url")
      .eq("id", uid)
      .single();
    
    if (data?.google_calendar_embed_url) {
      setCalendarUrl(data.google_calendar_embed_url);
      setTempCalendarUrl(data.google_calendar_embed_url);
    }
  };

  const saveCalendarConfig = async () => {
    if (!userId) return;
    
    const { error } = await supabase
      .from("profiles")
      .update({ google_calendar_embed_url: tempCalendarUrl })
      .eq("id", userId);
    
    if (error) {
      toast.error("Erro ao salvar configuração");
      return;
    }
    
    setCalendarUrl(tempCalendarUrl);
    setCalendarConfigOpen(false);
    toast.success("Agenda configurada com sucesso!");
  };
  
  // Upload de fotos com compressão
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    try {
      const uploadedPaths: string[] = [];
      
      // Opções de compressão
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
      for (const file of files) {
        // Comprimir imagem
        const compressedFile = await imageCompression(file, compressionOptions);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-photos')
          .upload(fileName, compressedFile);
        
        if (uploadError) throw uploadError;
        uploadedPaths.push(fileName);
      }
      
      // Buscar fotos existentes
      const existingPhotos = (property?.photos as string[]) || [];
      const updatedPhotos = [...existingPhotos, ...uploadedPaths];
      
      // Atualizar banco de dados
      const { error: updateError } = await supabase
        .from('properties')
        .update({ photos: updatedPhotos })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success(`${files.length} foto(s) adicionada(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload das fotos');
    }
  };
  
  // Upload de documentos
  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    try {
      const uploadedDocs: any[] = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        uploadedDocs.push({
          name: file.name,
          path: fileName,
          uploadedAt: new Date().toISOString()
        });
      }
      
      // Buscar documentos existentes
      const existingDocs = (property?.documents as any[]) || [];
      const updatedDocs = [...existingDocs, ...uploadedDocs];
      
      // Atualizar banco de dados
      const { error: updateError } = await supabase
        .from('properties')
        .update({ documents: updatedDocs })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success(`${files.length} documento(s) adicionado(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload dos documentos');
    }
  };
  
  // Deletar foto
  const handleDeletePhoto = async (photoPath: string) => {
    try {
      // Remover do storage
      const { error: storageError } = await supabase.storage
        .from('property-photos')
        .remove([photoPath]);
      
      if (storageError) throw storageError;
      
      // Atualizar banco de dados
      const photos = (property?.photos as string[]) || [];
      const updatedPhotos = photos.filter((p: string) => p !== photoPath);
      const { error: updateError } = await supabase
        .from('properties')
        .update({ photos: updatedPhotos })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success('Foto removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    } catch (error: any) {
      console.error('Erro ao deletar foto:', error);
      toast.error('Erro ao remover foto');
    }
  };
  
  // Deletar documento
  const handleDeleteDoc = async (docPath: string) => {
    try {
      // Remover do storage
      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .remove([docPath]);
      
      if (storageError) throw storageError;
      
      // Atualizar banco de dados
      const docs = (property?.documents as any[]) || [];
      const updatedDocs = docs.filter((d: any) => d.path !== docPath);
      const { error: updateError } = await supabase
        .from('properties')
        .update({ documents: updatedDocs })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success('Documento removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    } catch (error: any) {
      console.error('Erro ao deletar documento:', error);
      toast.error('Erro ao remover documento');
    }
  };
  
  // Definir foto de capa
  const handleSetCoverPhoto = async (photoPath: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ cover_photo: photoPath })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Foto de capa definida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    } catch (error: any) {
      console.error('Erro ao definir foto de capa:', error);
      toast.error('Erro ao definir foto de capa');
    }
  };
  
  // Abrir preview de PDF
  const handleOpenPdfPreview = async (doc: any) => {
    const { data, error } = await supabase.storage
      .from('property-documents')
      .createSignedUrl(doc.path, 3600); // URL válida por 1 hora
    
    if (error) {
      console.error('Erro ao gerar URL do documento:', error);
      toast.error('Erro ao carregar documento para visualização');
      return;
    }
    
    setSelectedPdfUrl(data.signedUrl);
    setSelectedPdfName(doc.name);
    setPdfPreviewOpen(true);
  };
  
  // Drag and Drop - Fotos
  const handlePhotosDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPhotosDragging(true);
  };
  
  const handlePhotosDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPhotosDragging(false);
  };
  
  const handlePhotosDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsPhotosDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length === 0) {
      toast.error('Nenhuma imagem válida encontrada');
      return;
    }
    
    try {
      const uploadedPaths: string[] = [];
      
      // Opções de compressão
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
      for (const file of files) {
        // Comprimir imagem
        const compressedFile = await imageCompression(file, compressionOptions);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-photos')
          .upload(fileName, compressedFile);
        
        if (uploadError) throw uploadError;
        uploadedPaths.push(fileName);
      }
      
      const existingPhotos = (property?.photos as string[]) || [];
      const updatedPhotos = [...existingPhotos, ...uploadedPaths];
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ photos: updatedPhotos })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success(`${files.length} foto(s) adicionada(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload das fotos');
    }
  };
  
  // Drag and Drop - Documentos
  const handleDocsDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDocsDragging(true);
  };
  
  const handleDocsDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDocsDragging(false);
  };
  
  const handleDocsDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDocsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    if (files.length === 0) {
      toast.error('Apenas arquivos PDF, DOC e DOCX são permitidos');
      return;
    }
    
    try {
      const uploadedDocs: any[] = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        uploadedDocs.push({
          name: file.name,
          path: fileName,
          uploadedAt: new Date().toISOString()
        });
      }
      
      const existingDocs = (property?.documents as any[]) || [];
      const updatedDocs = [...existingDocs, ...uploadedDocs];
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ documents: updatedDocs })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success(`${files.length} documento(s) adicionado(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload dos documentos');
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider defaultOpen={!isMobile}>
        <SidebarAvailableContext.Provider value={true}>
          <div className="flex h-screen w-full bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-muted-foreground">Carregando...</p>
              </div>
            </div>
          </div>
        </SidebarAvailableContext.Provider>
      </SidebarProvider>
    );
  }

  if (!property) {
    return (
      <SidebarProvider defaultOpen={!isMobile}>
        <SidebarAvailableContext.Provider value={true}>
          <div className="flex h-screen w-full bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header title="Imóvel não encontrado" />
              <main className="flex-1 flex items-center justify-center p-6">
                <Card className="w-full max-w-md">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Building2 className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Imóvel não encontrado</h3>
                    <p className="text-gray-500 text-center mb-4">
                      O imóvel que você está procurando não existe ou foi removido.
                    </p>
                    <Button onClick={() => navigate("/imoveis")}>Voltar para lista</Button>
                  </CardContent>
                </Card>
              </main>
            </div>
          </div>
        </SidebarAvailableContext.Provider>
      </SidebarProvider>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      available: { variant: "default" as const, label: "Disponível" },
      rented: { variant: "secondary" as const, label: "Contratado" },
      maintenance: { variant: "outline" as const, label: "Manutenção" },
      unavailable: { variant: "destructive" as const, label: "Indisponível" },
    };

    return variants[status as keyof typeof variants] || variants.available;
  };

  const getInvoiceStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "outline" as const, label: "Pendente" },
      paid: { variant: "default" as const, label: "Pago" },
      overdue: { variant: "destructive" as const, label: "Vencido" },
      cancelled: { variant: "secondary" as const, label: "Cancelado" },
    };

    return variants[status as keyof typeof variants] || variants.pending;
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <SidebarAvailableContext.Provider value={true}>
        <div className="flex h-screen w-full bg-gray-50">
          <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={property.name} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Alertas de Pendência */}
            {pendingInvoices.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Faturas de Aluguel Pendentes</strong>
                  <br />
                  Este imóvel possui {pendingInvoices.length} fatura(s) de aluguel pendente(s). 
                  Por favor, verifique o histórico de faturas abaixo.
                </AlertDescription>
              </Alert>
            )}

            {/* Identificação Completa */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold">{property.name}</h1>
                        <Badge variant={getStatusBadge(property.status).variant}>
                          {getStatusBadge(property.status).label}
                        </Badge>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <span className="text-sm">
                          {property.address}{property.number && `, ${property.number}`}
                          {property.complement && ` ${property.complement}`}
                          {property.neighborhood && `, ${property.neighborhood}`} - {property.city}/{property.state}
                          {property.postal_code && ` - CEP: ${property.postal_code}`}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tipo:</span>{" "}
                          <span className="font-medium capitalize">{property.property_type}</span>
                        </div>
                        {property.classification && (
                          <div>
                            <span className="text-muted-foreground">Classificação:</span>{" "}
                            <span className="font-medium">{property.classification}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo das Dimensões */}
                <div className="grid grid-cols-4 gap-4 py-4 border-t">
                  {property.useful_area && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Área Útil</p>
                      <p className="text-xl font-bold">{property.useful_area}m²</p>
                    </div>
                  )}
                  {property.total_area && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Área Total</p>
                      <p className="text-xl font-bold">{property.total_area}m²</p>
                    </div>
                  )}
                  {property.built_area && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Área Construção</p>
                      <p className="text-xl font-bold">{property.built_area}m²</p>
                    </div>
                  )}
                  {property.land_area && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Área Terreno</p>
                      <p className="text-xl font-bold">{property.land_area}m²</p>
                    </div>
                  )}
                </div>

                {/* Pessoas Vinculadas */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  {property.owner_name && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-primary/10 p-2">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Proprietário</p>
                            <p className="font-semibold">{property.owner_name}</p>
                            {property.owner_contact && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" /> {property.owner_contact}
                              </p>
                            )}
                            {property.owner_email && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" /> {property.owner_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {activeContract && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-secondary/10 p-2">
                            <User className="h-5 w-5 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Inquilino</p>
                            <p className="font-semibold">{activeContract.tenant_name}</p>
                            {activeContract.tenant_phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" /> {activeContract.tenant_phone}
                              </p>
                            )}
                            {activeContract.tenant_email && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" /> {activeContract.tenant_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Botão Editar */}
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/imoveis/${id}/editar`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Informações do Imóvel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto flex-col py-4 gap-2"
                onClick={() => setPersonsDialogOpen(true)}
              >
                <UserPlus className="h-5 w-5" />
                <span className="text-xs">Vincular Pessoas</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4 gap-2">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Cadastrar Documentos</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4 gap-2">
                <Home className="h-5 w-5" />
                <span className="text-xs">Anunciar Imóvel</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col py-4 gap-2"
                onClick={() => {
                  if (activeContract) {
                    navigate(`/contratos/${activeContract.id}`);
                  } else {
                    toast.error('Nenhum contrato ativo encontrado');
                  }
                }}
                disabled={!activeContract}
              >
                <Briefcase className="h-5 w-5" />
                <span className="text-xs">Ver Contrato</span>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Coluna Principal - 2/3 */}
              <div className="col-span-2 space-y-6">
                {/* Resumo do Contrato Vigente */}
                {activeContract ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5" />
                        Contrato Vigente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                          <p className="font-medium">Contrato de Locação</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Status</p>
                          <Badge variant="default">Vigente</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Início da Vigência</p>
                          <p className="font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(activeContract.start_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Fim da Vigência</p>
                          <p className="font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {activeContract.end_date ? new Date(activeContract.end_date).toLocaleDateString('pt-BR') : 'Indeterminado'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Valor</p>
                          <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            R$ {Number(activeContract.rental_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Vencimento</p>
                          <p className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Dia {activeContract.payment_day}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Garantia</p>
                          <p className="font-medium flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {activeContract.guarantee_type || 'Sem Garantia'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Reajuste</p>
                          <p className="font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            {activeContract.adjustment_index || 'Não especificado'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Método de Pagamento</p>
                          <p className="font-medium">{activeContract.payment_method === 'bank_transfer' ? 'Transferência Bancária' : activeContract.payment_method}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Cobrança Pré-Paga</p>
                          <p className="font-medium">{activeContract.pre_paid ? 'Sim' : 'Não'}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <Link to={`/contratos/${activeContract.id}`}>
                          <Button variant="outline" className="w-full">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes do Contrato
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileCheck className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="font-semibold mb-2">Sem contrato vigente</h3>
                      <p className="text-sm text-muted-foreground text-center mb-4">
                        Este imóvel não possui um contrato ativo no momento.
                      </p>
                      <Button onClick={() => navigate(`/contratos/novo/${id}`)}>
                        Criar Novo Contrato
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Tabela de Faturas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Histórico de Faturas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoices && invoices.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Método Pagamento</TableHead>
                            <TableHead>Referência</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Situação</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="text-sm">
                                {invoice.payment_method === 'bank_transfer' ? 'Transferência Bancária' : invoice.payment_method}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(invoice.reference_month).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-sm font-semibold">
                                R$ {Number(invoice.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getInvoiceStatusBadge(invoice.status).variant}>
                                  {getInvoiceStatusBadge(invoice.status).label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Link to={`/faturas/${invoice.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhuma fatura registrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Lateral - 1/3 */}
              <div className="space-y-6">
                {/* Fotos do Imóvel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Image className="h-5 w-5" />
                      Fotos do Imóvel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                    {property?.photos && Array.isArray(property.photos) && property.photos.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {(property.photos as string[]).map((photoPath: string, idx: number) => {
                            const { data: photoData } = supabase.storage
                              .from('property-photos')
                              .getPublicUrl(photoPath);
                            const isCover = property.cover_photo === photoPath;
                            
                            return (
                              <div key={idx} className="relative group">
                                <img 
                                  src={photoData.publicUrl} 
                                  alt={`Foto ${idx + 1}`}
                                  className={`w-full h-32 object-cover rounded-lg ${isCover ? 'ring-2 ring-primary' : ''}`}
                                />
                                {isCover && (
                                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-current" />
                                    Capa
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!isCover && (
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8"
                                      onClick={() => handleSetCoverPhoto(photoPath)}
                                      title="Definir como capa"
                                    >
                                      <Star className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-8 w-8"
                                    onClick={() => handleDeletePhoto(photoPath)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full"
                          onClick={() => photoInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Adicionar Mais Fotos
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className={`aspect-video rounded-lg flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-colors ${
                          isPhotosDragging 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted-foreground/25 bg-muted'
                        }`}
                        onDragOver={handlePhotosDragOver}
                        onDragLeave={handlePhotosDragLeave}
                        onDrop={handlePhotosDrop}
                      >
                        <Camera className={`h-12 w-12 ${isPhotosDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">
                            {isPhotosDragging ? 'Solte as fotos aqui' : 'Arraste fotos ou clique para selecionar'}
                          </p>
                          <p className="text-xs text-muted-foreground/75">PNG, JPG ou WEBP</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => photoInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Selecionar Fotos
                        </Button>
                      </div>
                    )}
                    <Button variant="link" className="w-full mt-3">
                      <Camera className="mr-2 h-4 w-4" />
                      Solicitar Fotógrafo
                    </Button>
                  </CardContent>
                </Card>

                {/* Documentos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-5 w-5" />
                      Documentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      className="hidden"
                      onChange={handleDocSelect}
                    />
                    <div className="space-y-2">
                      {property?.documents && Array.isArray(property.documents) && (property.documents as any[]).length > 0 ? (
                        <>
                          {(property.documents as any[]).map((doc: any, idx: number) => {
                            const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                            
                            return (
                              <div key={idx} className="flex items-center justify-between p-2 border rounded-lg group hover:bg-muted/50 transition-colors">
                                <div 
                                  className="flex items-center gap-2 flex-1 cursor-pointer"
                                  onClick={() => isPdf && handleOpenPdfPreview(doc)}
                                >
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm flex-1">{doc.name}</span>
                                  {isPdf && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Eye className="h-3 w-3 mr-1" />
                                      Preview
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteDoc(doc.path)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            );
                          })}
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            size="sm"
                            onClick={() => docInputRef.current?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Adicionar Mais Documentos
                          </Button>
                        </>
                      ) : (
                        <div 
                          className={`rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 transition-colors ${
                            isDocsDragging 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted-foreground/25 bg-muted'
                          }`}
                          onDragOver={handleDocsDragOver}
                          onDragLeave={handleDocsDragLeave}
                          onDrop={handleDocsDrop}
                        >
                          <FileText className={`h-10 w-10 ${isDocsDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1">
                              {isDocsDragging ? 'Solte os documentos aqui' : 'Arraste documentos ou clique para selecionar'}
                            </p>
                            <p className="text-xs text-muted-foreground/75">PDF, DOC ou DOCX</p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            size="sm"
                            onClick={() => docInputRef.current?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Selecionar Documentos
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Visitas e Propostas */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-5 w-5" />
                        Visitas e Propostas
                      </CardTitle>
                      <Dialog open={calendarConfigOpen} onOpenChange={setCalendarConfigOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Integrar Agenda Google</DialogTitle>
                            <DialogDescription>
                              Cole o link de incorporação da sua agenda do Google Calendar.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="calendar-url">URL do Google Calendar</Label>
                              <Input
                                id="calendar-url"
                                placeholder="https://calendar.google.com/calendar/embed?src=..."
                                value={tempCalendarUrl}
                                onChange={(e) => setTempCalendarUrl(e.target.value)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Para obter a URL, abra o Google Calendar, vá em Configurações {'>'} 
                              Configurações da sua agenda {'>'} Integrar agenda {'>'} copie a URL de incorporação.
                            </p>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setCalendarConfigOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={saveCalendarConfig}>
                              Salvar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {calendarUrl ? (
                      <div className="space-y-3">
                        <div className="rounded-lg overflow-hidden border">
                          <iframe 
                            src={calendarUrl} 
                            width="100%" 
                            height="400"
                            frameBorder="0"
                            scrolling="no"
                            title="Google Calendar"
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          size="sm"
                          onClick={() => setVisitDialogOpen(true)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Agendar Visita Manual
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Configure sua agenda do Google para visualizar aqui
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          size="sm"
                          onClick={() => setVisitDialogOpen(true)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Agendar Visita
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dados Cartoriais */}
                {property.registry_data && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileCheck className="h-5 w-5" />
                        Dados Cartoriais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{property.registry_data}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Dialogs */}
      <ScheduleVisitDialog
        open={visitDialogOpen}
        onOpenChange={setVisitDialogOpen}
        propertyId={id || ""}
      />
      <LinkedPersonsDialog
        open={personsDialogOpen}
        onOpenChange={setPersonsDialogOpen}
        propertyId={id || ""}
      />
      
      {/* PDF Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedPdfName}
            </DialogTitle>
            <DialogDescription>
              Visualização do documento PDF
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full h-full">
            <iframe
              src={selectedPdfUrl}
              className="w-full h-full rounded-lg border"
              title="PDF Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </SidebarAvailableContext.Provider>
    </SidebarProvider>
  );
};

export default PropertyDetails;
