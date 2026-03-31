import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { useQuery } from "@tanstack/react-query";
import { ExtraChargesDialog } from "@/components/Contracts/ExtraChargesDialog";
import { ContractHistoryTimeline } from "@/components/Contracts/ContractHistoryTimeline";
import { useLogContractEvent } from "@/hooks/useContractHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Building2, FileText, Download, AlertCircle, Plus, Edit, Upload, Trash2, Link2, Scale, XCircle, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";

interface Contract {
  id: string;
  contract_number: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  rental_value: number;
  payment_day: number;
  guarantee_type: string | null;
  guarantee_value: number | null;
  guarantee_installments: number | null;
  payment_method: string;
  adjustment_index: string | null;
  pre_paid: boolean;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  tenant_document: string | null;
  tenant_rg: string | null;
  tenant_profession: string | null;
  tenant_emergency_phone: string | null;
  co_tenants: any;
  property_id: string;
  extra_charges?: any[];
  water_amount: number | null;
  electricity_amount: number | null;
  gas_amount: number | null;
  internet_amount: number | null;
  condo_fee: number | null;
  cleaning_fee: number | null;
}

interface Property {
  id: string;
  name: string;
  address: string;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  country: string | null;
  property_type: string;
  classification: string | null;
  transaction_type: string | null;
  status: string;
  useful_area: number | null;
  land_area: number | null;
  total_area: number | null;
  built_area: number | null;
  construction_year: number | null;
  registry_data: string | null;
  owner_name: string | null;
  owner_contact: string | null;
  owner_email: string | null;
}

interface TenantContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  reference_month: string;
  due_date: string;
  payment_date: string | null;
  total_amount: number;
  status: string;
}

export default function ContractDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const [contract, setContract] = useState<Contract | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [extraChargesOpen, setExtraChargesOpen] = useState(false);
  const [tenantContact, setTenantContact] = useState<TenantContact | null>(null);
  const { mutate: logEvent } = useLogContractEvent();

  // Encerrar contrato
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminatingContract, setTerminatingContract] = useState(false);
  const [terminateForm, setTerminateForm] = useState({ date: "", reason: "", notes: "" });

  // Análise jurídica
  const [legalAnalysisOpen, setLegalAnalysisOpen] = useState(false);

  // Alterar conta
  const [changeAccountOpen, setChangeAccountOpen] = useState(false);
  const [savingAccountChange, setSavingAccountChange] = useState(false);
  const [selectedNewAccountId, setSelectedNewAccountId] = useState("");

  // Estados para vincular imóvel
  const [linkPropertyOpen, setLinkPropertyOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  // Estados para editar contrato
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    tenant_name: "",
    tenant_document: "",
    tenant_rg: "",
    tenant_email: "",
    tenant_phone: "",
    tenant_profession: "",
    tenant_emergency_phone: "",
    contract_number: "",
    start_date: "",
    end_date: "",
    rental_value: "",
    payment_day: "",
    payment_method: "",
    adjustment_index: "",
    pre_paid: false,
    guarantee_type: "",
    guarantee_value: "",
    guarantee_installments: "1",
    water_amount: "",
    electricity_amount: "",
    gas_amount: "",
    internet_amount: "",
    condo_fee: "",
    cleaning_fee: "",
  });

  // Query de contas disponíveis
  const { data: availableAccounts } = useQuery({
    queryKey: ["available-accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_name")
        .order("account_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && changeAccountOpen,
  });

  // Query de imóveis disponíveis para vincular
  const { data: availableProperties } = useQuery({
    queryKey: ["available-properties-link", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, status")
        .eq("account_id", accountId!)
        .in("status", ["disponivel", "available"])
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!accountId && linkPropertyOpen,
  });

  useEffect(() => {
    if (user && id) {
      fetchContractDetails();
    }
  }, [user, id]);

  const fetchContractDetails = async () => {
    try {
      // Fetch contract
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      if (contractError) throw contractError;
      setContract(contractData as any);

      // Fetch matching contact by tenant_name (fallback for null fields)
      if (contractData.tenant_name) {
        const { data: contactData } = await supabase
          .from("contacts")
          .select("id, name, email, phone, document")
          .ilike("name", `%${contractData.tenant_name}%`)
          .limit(1)
          .maybeSingle();
        if (contactData) setTenantContact(contactData as TenantContact);
      }

      // Fetch property (only if property_id exists)
      if (contractData.property_id) {
        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("*")
          .eq("id", contractData.property_id)
          .single();

        if (!propertyError && propertyData) {
          setProperty(propertyData);
        }
      }

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("contract_id", id)
        .neq("status", "cancelled")
        .order("due_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
    } catch (error: any) {
      console.error("Error fetching contract details:", error);
      toast.error("Erro ao carregar dados do contrato");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkProperty = async () => {
    if (!selectedPropertyId || !contract) return;
    setSavingLink(true);
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ property_id: selectedPropertyId })
        .eq("id", contract.id);
      if (error) throw error;

      await supabase
        .from("properties")
        .update({ status: "rented" })
        .eq("id", selectedPropertyId);

      logEvent({
        contractId: contract.id,
        eventType: "contract_updated",
        description: "Imóvel vinculado ao contrato",
        metadata: { property_id: selectedPropertyId },
      });

      toast.success("Imóvel vinculado com sucesso!");
      setLinkPropertyOpen(false);
      setSelectedPropertyId("");
      fetchContractDetails();
    } catch (err: any) {
      toast.error("Erro ao vincular imóvel: " + err.message);
    } finally {
      setSavingLink(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!contract) return;
    setSavingEdit(true);
    try {
      const payload: Record<string, any> = {
        tenant_name: editForm.tenant_name,
        tenant_document: editForm.tenant_document || null,
        tenant_rg: editForm.tenant_rg || null,
        tenant_email: editForm.tenant_email || null,
        tenant_phone: editForm.tenant_phone || null,
        tenant_profession: editForm.tenant_profession || null,
        tenant_emergency_phone: editForm.tenant_emergency_phone || null,
        contract_number: editForm.contract_number || null,
        start_date: editForm.start_date,
        end_date: editForm.end_date || null,
        rental_value: parseFloat(editForm.rental_value) || contract.rental_value,
        payment_day: parseInt(editForm.payment_day) || contract.payment_day,
        payment_method: editForm.payment_method || contract.payment_method,
        adjustment_index: editForm.adjustment_index || null,
        pre_paid: editForm.pre_paid,
        guarantee_type: editForm.guarantee_type || null,
        guarantee_value: editForm.guarantee_value ? parseFloat(editForm.guarantee_value) : null,
        guarantee_installments: editForm.guarantee_value && editForm.guarantee_type && editForm.guarantee_type !== "none" ? (parseInt(editForm.guarantee_installments) || 1) : null,
        water_amount: editForm.water_amount ? parseFloat(editForm.water_amount) : null,
        electricity_amount: editForm.electricity_amount ? parseFloat(editForm.electricity_amount) : null,
        gas_amount: editForm.gas_amount ? parseFloat(editForm.gas_amount) : null,
        internet_amount: editForm.internet_amount ? parseFloat(editForm.internet_amount) : null,
        condo_fee: editForm.condo_fee ? parseFloat(editForm.condo_fee) : null,
        cleaning_fee: editForm.cleaning_fee ? parseFloat(editForm.cleaning_fee) : null,
      };

      const { error } = await supabase
        .from("contracts")
        .update(payload)
        .eq("id", contract.id);

      if (error) throw error;

      logEvent({
        contractId: contract.id,
        eventType: "contract_updated",
        description: "Dados do contrato editados",
      });

      toast.success("Contrato atualizado!");
      setEditOpen(false);
      fetchContractDetails();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const openAditamentos = () => {
    if (!contract) return;
    setEditForm({
      tenant_name: contract.tenant_name ?? "",
      tenant_document: contract.tenant_document ?? "",
      tenant_rg: contract.tenant_rg ?? "",
      tenant_email: contract.tenant_email ?? "",
      tenant_phone: contract.tenant_phone ?? "",
      tenant_profession: contract.tenant_profession ?? "",
      tenant_emergency_phone: contract.tenant_emergency_phone ?? "",
      contract_number: contract.contract_number ?? "",
      start_date: contract.start_date ?? "",
      end_date: contract.end_date ?? "",
      rental_value: String(contract.rental_value ?? ""),
      payment_day: String(contract.payment_day ?? ""),
      payment_method: contract.payment_method ?? "",
      adjustment_index: contract.adjustment_index ?? "",
      pre_paid: contract.pre_paid ?? false,
      guarantee_type: contract.guarantee_type ?? "",
      guarantee_value: contract.guarantee_value ? String(contract.guarantee_value) : "",
      guarantee_installments: contract.guarantee_installments ? String(contract.guarantee_installments) : "1",
      water_amount: contract.water_amount ? String(contract.water_amount) : "",
      electricity_amount: contract.electricity_amount ? String(contract.electricity_amount) : "",
      gas_amount: contract.gas_amount ? String(contract.gas_amount) : "",
      internet_amount: contract.internet_amount ? String(contract.internet_amount) : "",
      condo_fee: contract.condo_fee ? String(contract.condo_fee) : "",
      cleaning_fee: contract.cleaning_fee ? String(contract.cleaning_fee) : "",
    });
    setEditOpen(true);
  };

  const handleTerminate = async () => {
    if (!contract || !terminateForm.date) return;
    setTerminatingContract(true);
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ status: "terminated", end_date: terminateForm.date })
        .eq("id", contract.id);
      if (error) throw error;

      if (contract.property_id) {
        await supabase
          .from("properties")
          .update({ status: "disponivel" })
          .eq("id", contract.property_id);
      }

      logEvent({
        contractId: contract.id,
        eventType: "contract_terminated",
        description: `Contrato encerrado — Motivo: ${terminateForm.reason || "Não informado"}`,
        metadata: { date: terminateForm.date, reason: terminateForm.reason, notes: terminateForm.notes },
      });

      toast.success("Contrato encerrado com sucesso!");
      setTerminateOpen(false);
      fetchContractDetails();
    } catch (err: any) {
      toast.error("Erro ao encerrar contrato: " + err.message);
    } finally {
      setTerminatingContract(false);
    }
  };

  const handleChangeAccount = async () => {
    if (!contract || !selectedNewAccountId) return;
    setSavingAccountChange(true);
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ account_id: selectedNewAccountId })
        .eq("id", contract.id);
      if (error) throw error;

      logEvent({
        contractId: contract.id,
        eventType: "contract_updated",
        description: "Conta do contrato alterada",
        metadata: { new_account_id: selectedNewAccountId },
      });

      toast.success("Conta alterada com sucesso!");
      setChangeAccountOpen(false);
      setSelectedNewAccountId("");
      fetchContractDetails();
    } catch (err: any) {
      toast.error("Erro ao alterar conta: " + err.message);
    } finally {
      setSavingAccountChange(false);
    }
  };

  const getLegalAnalysis = () => {
    if (!contract) return null;
    const today = new Date();
    const start = parseLocalDate(contract.start_date);
    const end = contract.end_date ? parseLocalDate(contract.end_date) : null;
    const daysActive = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = end ? Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const totalDuration = end ? Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : null;
    return { today, start, end, daysActive, daysRemaining, totalDuration };
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      vigente: "default",
      expired: "secondary",
      terminated: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status === "active" || status === "vigente" ? "Vigente" : status}</Badge>;
  };

  const getInvoiceStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      paid: "default",
      pending: "secondary",
      overdue: "destructive",
    };
    const labels: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
      overdue: "Atrasado",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <p>Contrato não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/documentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Dados do Contrato</h1>
              <p className="text-sm text-muted-foreground">
                <Link to="/" className="hover:underline">Dashboard</Link> / <Link to="/documentos" className="hover:underline">Documentos</Link> / Dados do Contrato
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-6">
        {/* Imóvel */}
        {property ? (
          <Card>
            <CardHeader>
              <CardTitle>Imóvel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Identificação */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Identificação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome / Identificação</p>
                    <p className="font-medium">{property.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">{property.property_type}</p>
                  </div>
                  {property.classification && (
                    <div>
                      <p className="text-sm text-muted-foreground">Classificação</p>
                      <p className="font-medium">{property.classification}</p>
                    </div>
                  )}
                  {property.transaction_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Transação</p>
                      <p className="font-medium">{property.transaction_type}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{property.status}</p>
                  </div>
                  {property.construction_year && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ano de Construção</p>
                      <p className="font-medium">{property.construction_year}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Localização */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Localização</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Logradouro</p>
                    <p className="font-medium">
                      {property.address}{property.number ? `, ${property.number}` : ""}{property.complement ? ` — ${property.complement}` : ""}
                    </p>
                  </div>
                  {property.neighborhood && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bairro</p>
                      <p className="font-medium">{property.neighborhood}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Cidade / Estado</p>
                    <p className="font-medium">{property.city} / {property.state}</p>
                  </div>
                  {property.postal_code && (
                    <div>
                      <p className="text-sm text-muted-foreground">CEP</p>
                      <p className="font-medium">{property.postal_code}</p>
                    </div>
                  )}
                  {property.country && (
                    <div>
                      <p className="text-sm text-muted-foreground">País</p>
                      <p className="font-medium">{property.country}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Áreas */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Áreas</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Área Útil</p>
                    <p className="font-medium">{property.useful_area ? `${property.useful_area} m²` : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Área Total</p>
                    <p className="font-medium">{property.total_area ? `${property.total_area} m²` : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Área Construída</p>
                    <p className="font-medium">{property.built_area ? `${property.built_area} m²` : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Terreno</p>
                    <p className="font-medium">{property.land_area ? `${property.land_area} m²` : "N/A"}</p>
                  </div>
                </div>
              </div>

              {property.registry_data && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Registro</p>
                    <p className="text-sm font-medium">{property.registry_data}</p>
                  </div>
                </>
              )}

              <Separator />

              <Button variant="outline" size="sm" asChild>
                <Link to={`/imoveis/${property.id}`}>Visualizar Imóvel Completo</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Imóvel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">Nenhum imóvel vinculado a este contrato.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLinkPropertyOpen(true)}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Vincular Imóvel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participantes */}
        <Card>
          <CardHeader>
            <CardTitle>Participantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {property ? (
              <div>
                <h3 className="font-semibold mb-3">Proprietário</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{property.owner_name || "N/A"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{property.owner_email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{property.owner_contact || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Proprietário não identificado — nenhum imóvel vinculado.</p>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Inquilino</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{contract.tenant_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{contract.tenant_document || tenantContact?.document || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RG</p>
                    <p className="font-medium">{contract.tenant_rg || "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{contract.tenant_email || tenantContact?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{contract.tenant_phone || tenantContact?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Profissão</p>
                    <p className="font-medium">{contract.tenant_profession || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tel. Emergência</p>
                    <p className="font-medium">{contract.tenant_emergency_phone || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            {contract.co_tenants && Array.isArray(contract.co_tenants) && contract.co_tenants.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Co-inquilinos</h3>
                  {contract.co_tenants.map((coTenant: any, index: number) => (
                    <div key={index} className="mb-3 p-3 bg-muted rounded-lg">
                      <p className="font-medium">{coTenant.name}</p>
                      <p className="text-sm text-muted-foreground">{coTenant.document} - {coTenant.relationship}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dados de Garantia */}
        {contract.guarantee_type && (
          <Card>
            <CardHeader>
              <CardTitle>Dados de Garantia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{contract.guarantee_type}</p>
              </div>
              {contract.guarantee_value && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor total</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(contract.guarantee_value)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dados do Contrato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Dados do Contrato
              <div className="flex items-center gap-2">
                {getStatusBadge(contract.status)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    openAditamentos();
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número do Contrato</p>
                <p className="font-medium">{contract.contract_number || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">Contrato de Locação</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Início da Vigência</p>
                <p className="font-medium">{format(parseLocalDate(contract.start_date), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fim do Contrato</p>
                <p className="font-medium">{contract.end_date ? format(parseLocalDate(contract.end_date), "dd/MM/yyyy", { locale: ptBR }) : "Indeterminado"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vencimento</p>
                <p className="font-medium">{contract.payment_day ? `Todo dia ${contract.payment_day}` : "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Índice de Inflação</p>
                <p className="font-medium">{contract.adjustment_index || "N/A"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cobrança Pré-paga</p>
                <p className="font-medium">{contract.pre_paid ? "Sim" : "Não"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                <p className="font-medium">{
                  contract.payment_method === "bank_transfer" ? "Transferência Bancária" :
                  contract.payment_method === "pix" ? "PIX" :
                  contract.payment_method === "cash" ? "Dinheiro" :
                  contract.payment_method === "check" ? "Cheque" :
                  contract.payment_method || "N/A"
                }</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Valor do Contrato</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(contract.rental_value)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Faturas */}
        <Card>
          <CardHeader>
            <CardTitle>Faturas</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma fatura encontrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{`${invoice.reference_month.slice(5, 7)}/${invoice.reference_month.slice(0, 4)}`}</TableCell>
                      <TableCell>{format(parseLocalDate(invoice.due_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(invoice.total_amount)}
                      </TableCell>
                      <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/faturas/${invoice.id}`}>Visualizar</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Documentos Anexos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Documentos Anexos
              <label htmlFor="upload-doc" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Anexar PDF
                  </span>
                </Button>
                <input
                  id="upload-doc"
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    if (!e.target.files || !user?.id) return;
                    for (const file of Array.from(e.target.files)) {
                      const objectKey = `${Date.now()}_${crypto.randomUUID()}.pdf`;
                      const storagePath = `${user.id}/${contract.id}/${objectKey}`;
                      const contentType = file.type?.trim() || "application/pdf";
                      let { error: upErr } = await supabase.storage
                        .from("contract-documents")
                        .upload(storagePath, file, { contentType, upsert: false });
                      // Retry without explicit contentType if 400 error
                      if (upErr && (upErr as any).statusCode === "400") {
                        const retry = await supabase.storage
                          .from("contract-documents")
                          .upload(storagePath, file, { upsert: false });
                        upErr = retry.error;
                      }
                      if (upErr) { toast.error(`Erro ao enviar ${file.name}: ${(upErr as any).message ?? upErr}`); continue; }
                      const existingDocs = Array.isArray(contract.extra_charges) ? [] : [];
                      const docs = Array.isArray((contract as any).documents) ? (contract as any).documents : [];
                      const newDoc = { name: file.name, path: storagePath, type: file.type, size: file.size, uploaded_at: new Date().toISOString() };
                      await supabase.from("contracts").update({ documents: [...docs, newDoc] } as any).eq("id", contract.id);
                      toast.success(`${file.name} anexado`);
                      logEvent({
                        contractId: contract.id,
                        eventType: "document_uploaded",
                        description: `Documento anexado: ${file.name}`,
                        metadata: { file_name: file.name, file_size: file.size },
                      });
                    }
                    fetchContractDetails();
                  }}
                />
              </label>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!contract || !Array.isArray((contract as any).documents) || (contract as any).documents.length === 0) ? (
              <p className="text-muted-foreground">Nenhum documento anexado</p>
            ) : (
              <div className="space-y-2">
                {((contract as any).documents as any[]).map((doc: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.uploaded_at ? format(new Date(doc.uploaded_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from("contract-documents")
                            .createSignedUrl(doc.path, 3600);
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, "_blank");
                          } else {
                            toast.error("Erro ao gerar link do documento");
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (!confirm(`Deseja excluir "${doc.name}"?`)) return;
                          try {
                            // Remove from storage
                            await supabase.storage
                              .from("contract-documents")
                              .remove([doc.path]);

                            // Remove from contract documents array
                            const docs = Array.isArray((contract as any).documents) ? (contract as any).documents : [];
                            const updatedDocs = docs.filter((_: any, i: number) => i !== idx);
                            await supabase
                              .from("contracts")
                              .update({ documents: updatedDocs } as any)
                              .eq("id", contract.id);

                            toast.success("Documento excluído");
                            fetchContractDetails();
                          } catch (err: any) {
                            toast.error("Erro ao excluir: " + err.message);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações do Contrato */}
        <Card>
          <CardHeader>
            <CardTitle>Ações do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setTerminateForm({ date: format(new Date(), "yyyy-MM-dd"), reason: "", notes: "" });
                  setTerminateOpen(true);
                }}
                disabled={contract.status === "terminated"}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Encerrar contrato
              </Button>
              <Button variant="outline" onClick={openAditamentos}>
                <Edit className="mr-2 h-4 w-4" />
                Aditamentos
              </Button>
              <Button variant="outline" onClick={() => setLegalAnalysisOpen(true)}>
                <Scale className="mr-2 h-4 w-4" />
                Análise jurídica
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedNewAccountId("");
                  setChangeAccountOpen(true);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Alterar conta
              </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setExtraChargesOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Cobranças adicionais
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* Histórico */}
        <ContractHistoryTimeline contractId={contract.id} />
      </div>

      {/* Dialog: Vincular Imóvel */}
      <Dialog open={linkPropertyOpen} onOpenChange={setLinkPropertyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Vincular Imóvel ao Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Selecione o imóvel disponível</Label>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um imóvel..." />
              </SelectTrigger>
              <SelectContent>
                {availableProperties && availableProperties.length > 0 ? (
                  availableProperties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.address ? ` — ${p.address}` : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Nenhum imóvel disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkPropertyOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleLinkProperty}
              disabled={!selectedPropertyId || savingLink}
            >
              {savingLink ? "Vinculando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Contrato */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Contrato
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Inquilino */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Dados do Inquilino</h4>
              <div className="space-y-3">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={editForm.tenant_name}
                    onChange={(e) => setEditForm(f => ({ ...f, tenant_name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CPF/CNPJ</Label>
                    <Input
                      value={editForm.tenant_document}
                      onChange={(e) => setEditForm(f => ({ ...f, tenant_document: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>RG</Label>
                    <Input
                      value={editForm.tenant_rg}
                      onChange={(e) => setEditForm(f => ({ ...f, tenant_rg: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editForm.tenant_email}
                      onChange={(e) => setEditForm(f => ({ ...f, tenant_email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={editForm.tenant_phone}
                      onChange={(e) => setEditForm(f => ({ ...f, tenant_phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Profissão</Label>
                    <Input
                      value={editForm.tenant_profession}
                      onChange={(e) => setEditForm(f => ({ ...f, tenant_profession: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Tel. Emergência</Label>
                    <Input
                      value={editForm.tenant_emergency_phone}
                      onChange={(e) => setEditForm(f => ({ ...f, tenant_emergency_phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados do Contrato */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Dados do Contrato</h4>
              <div className="space-y-3">
                <div>
                  <Label>Número do Contrato</Label>
                  <Input
                    value={editForm.contract_number}
                    onChange={(e) => setEditForm(f => ({ ...f, contract_number: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data de Início *</Label>
                    <Input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Data de Término</Label>
                    <Input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm(f => ({ ...f, end_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor do Aluguel (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.rental_value}
                      onChange={(e) => setEditForm(f => ({ ...f, rental_value: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Dia de Vencimento</Label>
                    <Select
                      value={editForm.payment_day}
                      onValueChange={(v) => setEditForm(f => ({ ...f, payment_day: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Método de Pagamento</Label>
                    <Select
                      value={editForm.payment_method}
                      onValueChange={(v) => setEditForm(f => ({ ...f, payment_method: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="debit">Débito Automático</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Índice de Reajuste</Label>
                    <Select
                      value={editForm.adjustment_index}
                      onValueChange={(v) => setEditForm(f => ({ ...f, adjustment_index: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IPCA">IPCA</SelectItem>
                        <SelectItem value="IGPM">IGP-M</SelectItem>
                        <SelectItem value="INPC">INPC</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit_pre_paid"
                    checked={editForm.pre_paid}
                    onCheckedChange={(checked) => setEditForm(f => ({ ...f, pre_paid: !!checked }))}
                  />
                  <Label htmlFor="edit_pre_paid" className="cursor-pointer">Cobrança Pré-Paga</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Encargos do Imóvel */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Encargos do Imóvel (Valores Mensais)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Condomínio (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={editForm.condo_fee}
                    onChange={(e) => setEditForm(f => ({ ...f, condo_fee: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Água (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={editForm.water_amount}
                    onChange={(e) => setEditForm(f => ({ ...f, water_amount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Energia Elétrica (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={editForm.electricity_amount}
                    onChange={(e) => setEditForm(f => ({ ...f, electricity_amount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Gás (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={editForm.gas_amount}
                    onChange={(e) => setEditForm(f => ({ ...f, gas_amount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Internet (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={editForm.internet_amount}
                    onChange={(e) => setEditForm(f => ({ ...f, internet_amount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Estacionamento (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={editForm.cleaning_fee}
                    onChange={(e) => setEditForm(f => ({ ...f, cleaning_fee: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Garantia */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Garantia</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Garantia</Label>
                  <Select
                    value={editForm.guarantee_type}
                    onValueChange={(v) => setEditForm(f => ({ ...f, guarantee_type: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Caução em Dinheiro</SelectItem>
                      <SelectItem value="guarantor">Fiador</SelectItem>
                      <SelectItem value="insurance">Seguro Fiança</SelectItem>
                      <SelectItem value="none">Sem Garantia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.guarantee_type && editForm.guarantee_type !== "none" && (
                  <div>
                    <Label>Valor da Garantia (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.guarantee_value}
                      onChange={(e) => setEditForm(f => ({ ...f, guarantee_value: e.target.value }))}
                    />
                  </div>
                )}
                {editForm.guarantee_type && editForm.guarantee_type !== "none" && editForm.guarantee_value && (
                  <div className="col-span-2">
                    <Label>Cobrar em quantas parcelas?</Label>
                    <Select
                      value={editForm.guarantee_installments}
                      onValueChange={(v) => setEditForm(f => ({ ...f, guarantee_installments: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}x {editForm.guarantee_value ? `(R$ ${(parseFloat(editForm.guarantee_value) / n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / parcela)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExtraChargesDialog
        open={extraChargesOpen}
        onOpenChange={(open) => {
          setExtraChargesOpen(open);
          if (!open) {
            logEvent({
              contractId: contract.id,
              eventType: "extra_charge_added",
              description: "Cobranças adicionais atualizadas",
            });
          }
        }}
        contractId={contract.id}
        contractEndDate={contract.end_date}
        existingCharges={contract.extra_charges || []}
        onUpdate={fetchContractDetails}
      />

      {/* Dialog: Encerrar Contrato */}
      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Encerrar Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Esta ação encerrará o contrato e liberará o imóvel vinculado. O histórico será mantido.
            </p>
            <div>
              <Label>Data de Encerramento *</Label>
              <Input
                type="date"
                value={terminateForm.date}
                onChange={(e) => setTerminateForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Motivo do Encerramento</Label>
              <Select
                value={terminateForm.reason}
                onValueChange={(v) => setTerminateForm(f => ({ ...f, reason: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fim_vigencia">Fim da Vigência</SelectItem>
                  <SelectItem value="distrato">Distrato Amigável</SelectItem>
                  <SelectItem value="inadimplencia">Inadimplência</SelectItem>
                  <SelectItem value="rescisao_inquilino">Rescisão pelo Inquilino</SelectItem>
                  <SelectItem value="rescisao_proprietario">Rescisão pelo Proprietário</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais sobre o encerramento..."
                value={terminateForm.notes}
                onChange={(e) => setTerminateForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={!terminateForm.date || terminatingContract}
            >
              {terminatingContract ? "Encerrando..." : "Confirmar Encerramento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Análise Jurídica */}
      <Dialog open={legalAnalysisOpen} onOpenChange={setLegalAnalysisOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Análise Jurídica do Contrato
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const analysis = getLegalAnalysis();
            if (!analysis) return null;
            const { start, end, daysActive, daysRemaining, totalDuration } = analysis;
            return (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Início da Vigência</p>
                    <p className="font-semibold text-sm">{format(start, "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Término</p>
                    <p className="font-semibold text-sm">{end ? format(end, "dd/MM/yyyy", { locale: ptBR }) : "Indeterminado"}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Dias Ativos</p>
                    <p className="font-semibold text-sm">{daysActive} dias</p>
                  </div>
                  {daysRemaining !== null && (
                    <div className={`p-3 rounded-lg ${daysRemaining < 30 ? "bg-destructive/10" : "bg-muted"}`}>
                      <p className="text-xs text-muted-foreground">Dias Restantes</p>
                      <p className={`font-semibold text-sm ${daysRemaining < 30 ? "text-destructive" : ""}`}>
                        {daysRemaining > 0 ? `${daysRemaining} dias` : "Expirado"}
                      </p>
                    </div>
                  )}
                  {totalDuration !== null && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Duração Total</p>
                      <p className="font-semibold text-sm">{totalDuration} dias ({Math.round(totalDuration / 30)} meses)</p>
                    </div>
                  )}
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Valor Mensal</p>
                    <p className="font-semibold text-sm">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(contract!.rental_value)}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Informações Legais</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Índice de reajuste:</span>
                      <span className="font-medium">{contract!.adjustment_index || "Não definido"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo de garantia:</span>
                      <span className="font-medium">{contract!.guarantee_type || "Sem garantia"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aviso prévio (Lei 8.245/91):</span>
                      <span className="font-medium">30 dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Multa por rescisão antecipada:</span>
                      <span className="font-medium">{daysRemaining !== null && daysRemaining > 0 ? `Proporcional ao período restante` : "Não aplicável"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status atual:</span>
                      <span className="font-medium capitalize">{contract!.status === "active" || contract!.status === "vigente" ? "Vigente" : contract!.status === "terminated" ? "Encerrado" : contract!.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button onClick={() => setLegalAnalysisOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Alterar Conta */}
      <Dialog open={changeAccountOpen} onOpenChange={setChangeAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Alterar Conta do Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione a conta para a qual este contrato será transferido.
            </p>
            <div>
              <Label>Nova Conta</Label>
              <Select value={selectedNewAccountId} onValueChange={setSelectedNewAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta..." /></SelectTrigger>
                <SelectContent>
                  {availableAccounts && availableAccounts.length > 0 ? (
                    availableAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Nenhuma conta disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeAccountOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleChangeAccount}
              disabled={!selectedNewAccountId || savingAccountChange}
            >
              {savingAccountChange ? "Alterando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
