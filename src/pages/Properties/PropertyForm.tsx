import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header, SidebarAvailableContext } from "@/components/Layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { Save, FileText } from "lucide-react";
import { z } from "zod";

const propertySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  property_type: z.string().min(1, "Tipo é obrigatório"),
  classification: z.string().optional(),
  status: z.string().min(1, "Status é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório").max(500),
  number: z.string().max(20).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().min(1, "Cidade é obrigatória").max(100),
  state: z.string().min(1, "Estado é obrigatório").max(2),
  postal_code: z.string().max(20).optional(),
  complement: z.string().max(200).optional(),
  useful_area: z.number().positive().optional(),
  total_area: z.number().positive().optional(),
  construction_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  owner_name: z.string().max(200).optional(),
  owner_contact: z.string().max(50).optional(),
  owner_email: z.string().email().max(200).optional(),
});

const PropertyForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(!!id);
  const [formData, setFormData] = useState({
    name: "",
    property_type: "",
    classification: "",
    status: "available",
    address: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    postal_code: "",
    complement: "",
    useful_area: "",
    total_area: "",
    construction_year: "",
    owner_name: "",
    owner_contact: "",
    owner_email: "",
    registry_data: "",
  });

  useEffect(() => {
    if (id) {
      loadPropertyData();
    }
  }, [id]);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setFormData({
          name: data.name || "",
          property_type: data.property_type || "",
          classification: data.classification || "",
          status: data.status || "available",
          address: data.address || "",
          number: data.number || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          complement: data.complement || "",
          useful_area: data.useful_area?.toString() || "",
          total_area: data.total_area?.toString() || "",
          construction_year: data.construction_year?.toString() || "",
          owner_name: data.owner_name || "",
          owner_contact: data.owner_contact || "",
          owner_email: data.owner_email || "",
          registry_data: data.registry_data || "",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do imóvel.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare data for validation
      const dataToValidate = {
        ...formData,
        useful_area: formData.useful_area ? parseFloat(formData.useful_area) : undefined,
        total_area: formData.total_area ? parseFloat(formData.total_area) : undefined,
        construction_year: formData.construction_year ? parseInt(formData.construction_year) : undefined,
      };

      // Validate with zod
      const validatedData = propertySchema.parse(dataToValidate);

      // Prepare insert data with only defined values
      const insertData: any = {
        user_id: user?.id,
        account_id: accountId,
        name: validatedData.name,
        property_type: validatedData.property_type,
        status: validatedData.status,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
      };

      // Add optional fields only if they have values
      if (validatedData.classification) insertData.classification = validatedData.classification;
      if (validatedData.number) insertData.number = validatedData.number;
      if (validatedData.neighborhood) insertData.neighborhood = validatedData.neighborhood;
      if (validatedData.postal_code) insertData.postal_code = validatedData.postal_code;
      if (validatedData.complement) insertData.complement = validatedData.complement;
      if (validatedData.useful_area) insertData.useful_area = validatedData.useful_area;
      if (validatedData.total_area) insertData.total_area = validatedData.total_area;
      if (validatedData.construction_year) insertData.construction_year = validatedData.construction_year;
      if (validatedData.owner_name) insertData.owner_name = validatedData.owner_name;
      if (validatedData.owner_contact) insertData.owner_contact = validatedData.owner_contact;
      if (validatedData.owner_email) insertData.owner_email = validatedData.owner_email;
      if (formData.registry_data) insertData.registry_data = formData.registry_data;

      if (id) {
        // Update existing property
        const { error } = await supabase
          .from("properties")
          .update(insertData)
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Imóvel atualizado!",
          description: "O imóvel foi atualizado com sucesso.",
        });
      } else {
        // Insert new property
        const { error } = await supabase.from("properties").insert([insertData]);

        if (error) throw error;

        toast({
          title: "Imóvel cadastrado!",
          description: "O imóvel foi cadastrado com sucesso.",
        });
      }

      navigate("/imoveis");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao cadastrar",
          description: "Ocorreu um erro ao cadastrar o imóvel. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoadingData) {
    return (
      <SidebarProvider defaultOpen={!isMobile}>
        <SidebarAvailableContext.Provider value={true}>
          <div className="flex h-screen w-full bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-muted-foreground">Carregando dados...</p>
              </div>
            </div>
          </div>
        </SidebarAvailableContext.Provider>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <SidebarAvailableContext.Provider value={true}>
        <div className="flex h-screen w-full bg-gray-50">
          <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={id ? "Editar Imóvel" : "Cadastrar Imóvel"} />

        <main className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit}>
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>Dados principais do imóvel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Imóvel *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Ex: Apartamento Centro"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="property_type">Tipo de Propriedade *</Label>
                      <Select value={formData.property_type} onValueChange={(value) => handleChange("property_type", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residencial">Residencial</SelectItem>
                          <SelectItem value="comercial">Comercial</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                          <SelectItem value="rural">Rural</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="classification">Classificação</Label>
                      <Input
                        id="classification"
                        value={formData.classification}
                        onChange={(e) => handleChange("classification", e.target.value)}
                        placeholder="Ex: Apartamento, Casa, Sala"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status *</Label>
                      <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Disponível</SelectItem>
                          <SelectItem value="rented">Alugado</SelectItem>
                          <SelectItem value="maintenance">Manutenção</SelectItem>
                          <SelectItem value="unavailable">Indisponível</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Endereço */}
              <Card>
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                  <CardDescription>Localização do imóvel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="address">Endereço *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleChange("address", e.target.value)}
                        placeholder="Rua, Avenida, etc."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) => handleChange("number", e.target.value)}
                        placeholder="123"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => handleChange("neighborhood", e.target.value)}
                        placeholder="Centro"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleChange("city", e.target.value)}
                        placeholder="São Paulo"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleChange("state", e.target.value.toUpperCase())}
                        placeholder="SP"
                        maxLength={2}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postal_code">CEP</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => handleChange("postal_code", e.target.value)}
                        placeholder="12345-678"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={formData.complement}
                        onChange={(e) => handleChange("complement", e.target.value)}
                        placeholder="Apto 101, Bloco A"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Características */}
              <Card>
                <CardHeader>
                  <CardTitle>Características</CardTitle>
                  <CardDescription>Detalhes técnicos do imóvel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="useful_area">Área Útil (m²)</Label>
                      <Input
                        id="useful_area"
                        type="number"
                        step="0.01"
                        value={formData.useful_area}
                        onChange={(e) => handleChange("useful_area", e.target.value)}
                        placeholder="50.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="total_area">Área Total (m²)</Label>
                      <Input
                        id="total_area"
                        type="number"
                        step="0.01"
                        value={formData.total_area}
                        onChange={(e) => handleChange("total_area", e.target.value)}
                        placeholder="65.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="construction_year">Ano de Construção</Label>
                      <Input
                        id="construction_year"
                        type="number"
                        value={formData.construction_year}
                        onChange={(e) => handleChange("construction_year", e.target.value)}
                        placeholder="2020"
                      />
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <Label htmlFor="registry_data">Dados Cartoriais</Label>
                      <Textarea
                        id="registry_data"
                        value={formData.registry_data}
                        onChange={(e) => handleChange("registry_data", e.target.value)}
                        placeholder="Matrícula, registro, etc."
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Proprietário */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Proprietário</CardTitle>
                  <CardDescription>Informações de contato</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="owner_name">Nome do Proprietário</Label>
                      <Input
                        id="owner_name"
                        value={formData.owner_name}
                        onChange={(e) => handleChange("owner_name", e.target.value)}
                        placeholder="João Silva"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_contact">Telefone</Label>
                      <Input
                        id="owner_contact"
                        value={formData.owner_contact}
                        onChange={(e) => handleChange("owner_contact", e.target.value)}
                        placeholder="(11) 98765-4321"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_email">Email</Label>
                      <Input
                        id="owner_email"
                        type="email"
                        value={formData.owner_email}
                        onChange={(e) => handleChange("owner_email", e.target.value)}
                        placeholder="proprietario@email.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/imoveis")}>
                  Cancelar
                </Button>
                <Button type="button" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Salvar como Rascunho
                </Button>
                <Button type="submit" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Salvando..." : (id ? "Atualizar Imóvel" : "Cadastrar Imóvel")}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>
        </div>
      </SidebarAvailableContext.Provider>
    </SidebarProvider>
  );
};

export default PropertyForm;
