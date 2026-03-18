import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ExtraChargesDialog } from "@/components/Contracts/ExtraChargesDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, Download, AlertCircle, Plus, Edit, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  property_type: string;
  status: string;
  useful_area: number | null;
  land_area: number | null;
  owner_name: string | null;
  owner_contact: string | null;
  owner_email: string | null;
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
  const [contract, setContract] = useState<Contract | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [extraChargesOpen, setExtraChargesOpen] = useState(false);

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
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{property.property_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disponível</p>
                  <p className="font-medium">{property.status === "available" ? "Sim" : "Não"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-medium">{property.address}, {property.city}/{property.state}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Área Útil</p>
                  <p className="font-medium">{property.useful_area ? `${property.useful_area} m²` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Terreno</p>
                  <p className="font-medium">{property.land_area ? `${property.land_area} m²` : "N/A"}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/imoveis/${property.id}`}>Visualizar Imóvel</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Imóvel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Nenhum imóvel vinculado a este contrato.</p>
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
            <div>
              <h3 className="font-semibold mb-3">Proprietário</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{property?.owner_name || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{property?.owner_email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{property?.owner_contact || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

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
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{contract.tenant_email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{contract.tenant_phone || "N/A"}</p>
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
              {getStatusBadge(contract.status)}
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
                <p className="font-medium">{format(new Date(contract.start_date), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fim do Contrato</p>
                <p className="font-medium">{contract.end_date ? format(new Date(contract.end_date), "dd/MM/yyyy", { locale: ptBR }) : "Indeterminado"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vencimento</p>
                <p className="font-medium">Todo dia {contract.payment_day}</p>
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
                <p className="font-medium">{contract.payment_method === "bank_transfer" ? "Transferência Bancária" : contract.payment_method}</p>
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
                      <TableCell>{format(new Date(invoice.reference_month), "MM/yyyy")}</TableCell>
                      <TableCell>{format(new Date(invoice.due_date), "dd/MM/yyyy")}</TableCell>
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
                      const storagePath = `${user.id}/${contract.id}/${Date.now()}_${file.name}`;
                      const { error: upErr } = await supabase.storage
                        .from("contract-documents")
                        .upload(storagePath, file, { contentType: file.type });
                      if (upErr) { toast.error(`Erro ao enviar ${file.name}`); continue; }
                      const existingDocs = Array.isArray(contract.extra_charges) ? [] : [];
                      const docs = Array.isArray((contract as any).documents) ? (contract as any).documents : [];
                      const newDoc = { name: file.name, path: storagePath, type: file.type, size: file.size, uploaded_at: new Date().toISOString() };
                      await supabase.from("contracts").update({ documents: [...docs, newDoc] } as any).eq("id", contract.id);
                      toast.success(`${file.name} anexado`);
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
              <Button variant="outline" disabled>
                <AlertCircle className="mr-2 h-4 w-4" />
                Encerrar contrato
              </Button>
              <Button variant="outline" disabled>
                <Plus className="mr-2 h-4 w-4" />
                Aditamentos
              </Button>
              <Button variant="outline" disabled>
                <FileText className="mr-2 h-4 w-4" />
                Análise jurídica
              </Button>
              <Button variant="outline" disabled>
                <Edit className="mr-2 h-4 w-4" />
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
      </div>

      <ExtraChargesDialog
        open={extraChargesOpen}
        onOpenChange={setExtraChargesOpen}
        contractId={contract.id}
        contractEndDate={contract.end_date}
        existingCharges={contract.extra_charges || []}
        onUpdate={fetchContractDetails}
      />
    </div>
  );
}
