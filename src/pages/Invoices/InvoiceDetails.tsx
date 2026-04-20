import { useParams, useNavigate, Link } from "react-router-dom";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle, XCircle, FileText, Home, User, Calendar, Pencil, Trash2, FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditInvoiceDialog } from "@/components/Invoices/EditInvoiceDialog";
import { buildInvoiceHTML } from "@/components/Invoices/buildInvoiceHTML";

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleExportPDF = () => {
    if (!invoice) return;
    const html = buildInvoiceHTML(invoice);
    const win = window.open("", "_blank");
    if (!win) {
      toast({
        title: "Pop-up bloqueado",
        description: "Permita pop-ups para visualizar a fatura.",
        variant: "destructive",
      });
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
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
            tenant_phone,
            tenant_document,
            co_tenants,
            payment_method,
            guarantee_type,
            guarantee_installments,
            start_date,
            end_date,
            properties (
              id,
              name,
              address,
              number,
              complement,
              neighborhood,
              city,
              state,
              postal_code,
              owner_name,
              owner_email,
              owner_contact
            )
          ),
          properties (
            id,
            name,
            address,
            number,
            complement,
            neighborhood,
            city,
            state,
            postal_code,
            owner_name,
            owner_email,
            owner_contact
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Use property from contract if invoice doesn't have direct property
      const property = data.properties || data.contracts?.properties;
      return { ...data, resolvedProperty: property };
    },
    enabled: !!user?.id && !!id,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      const currentHistory = Array.isArray(invoice?.history) ? invoice.history : [];
      const { error } = await supabase
        .from("invoices")
        .update({ 
          status: "paid",
          payment_date: new Date().toISOString().split('T')[0],
          history: [
            ...currentHistory,
            {
              action: 'marked_as_paid',
              timestamp: new Date().toISOString(),
              user_id: user?.id
            }
          ]
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Fatura marcada como paga",
        description: "O status da fatura foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar fatura",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const cancelInvoiceMutation = useMutation({
    mutationFn: async () => {
      // Excluir a fatura ao invés de apenas mudar o status para 'cancelled'
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Fatura apagada",
        description: "A fatura foi apagada com sucesso.",
      });
      navigate("/faturas");
    },
    onError: (error) => {
      toast({
        title: "Erro ao apagar fatura",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const reactivateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const currentHistory = Array.isArray(invoice?.history) ? invoice.history : [];
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "pending",
          history: [
            ...currentHistory,
            {
              action: 'reactivated',
              timestamp: new Date().toISOString(),
              user_id: user?.id
            }
          ]
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Fatura reativada",
        description: "A fatura voltou ao status Pendente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao reativar fatura",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <AppLayout title="Detalhes da Fatura">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout title="Fatura não encontrada">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Fatura não encontrada</h3>
            <Button onClick={() => navigate("/faturas")} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Faturas
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status === "pending";
  const getStatusBadge = () => {
    if (invoice.status === "paid") return <Badge variant="default">Pago</Badge>;
    if (invoice.status === "cancelled") return <Badge variant="outline">Cancelada</Badge>;
    if (isOverdue) return <Badge variant="destructive">Vencida</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <AppLayout title="Detalhes da Fatura">
      <div className="max-w-5xl mx-auto space-y-6">
            {/* Header with actions */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate("/faturas")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Visualizar / Imprimir
                </Button>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                  disabled={invoice.status === "cancelled"}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                {invoice.status === "cancelled" && (
                  <Button
                    variant="outline"
                    onClick={() => reactivateInvoiceMutation.mutate()}
                    disabled={reactivateInvoiceMutation.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Reativar Fatura
                  </Button>
                )}
                {(invoice.status === "pending" || invoice.status === "overdue") && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => cancelInvoiceMutation.mutate()}
                      disabled={cancelInvoiceMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Apagar Fatura
                    </Button>
                    <Button
                      onClick={() => markAsPaidMutation.mutate()}
                      disabled={markAsPaidMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Marcar como Pago
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Invoice Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Fatura {invoice.invoice_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Emitida em {format(new Date(invoice.issue_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Competência</p>
                    <p className="font-medium">
                      {format(new Date(Number(invoice.reference_month.slice(0, 4)), Number(invoice.reference_month.slice(5, 7)) - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p className="font-medium">
                      {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  {invoice.payment_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Pagamento</p>
                      <p className="font-medium">
                        {format(new Date(invoice.payment_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Property Info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Home className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Imóvel</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{invoice.resolvedProperty?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {invoice.resolvedProperty?.address ? `${invoice.resolvedProperty.address}, ${invoice.resolvedProperty.number || ''}${invoice.resolvedProperty.complement ? ` - ${invoice.resolvedProperty.complement}` : ''}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bairro</p>
                      <p className="font-medium">{invoice.resolvedProperty?.neighborhood || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cidade</p>
                      <p className="font-medium">
                        {invoice.resolvedProperty?.city ? `${invoice.resolvedProperty.city} - ${invoice.resolvedProperty.state}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Proprietário</p>
                      <p className="font-medium">{invoice.resolvedProperty?.owner_name || "-"}</p>
                    </div>
                    {invoice.resolvedProperty?.owner_contact && (
                      <div>
                        <p className="text-sm text-muted-foreground">Contato do Proprietário</p>
                        <p className="font-medium">{invoice.resolvedProperty.owner_contact}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Tenant Info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Inquilino(s)</h3>
                  </div>
                  <div className="space-y-4">
                    {/* Main Tenant */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Inquilino Principal</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Nome</p>
                          <p className="font-medium">{invoice.contracts?.tenant_name}</p>
                        </div>
                        {invoice.contracts?.tenant_email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{invoice.contracts.tenant_email}</p>
                          </div>
                        )}
                        {invoice.contracts?.tenant_phone && (
                          <div>
                            <p className="text-sm text-muted-foreground">Telefone</p>
                            <p className="font-medium">{invoice.contracts.tenant_phone}</p>
                          </div>
                        )}
                        {invoice.contracts?.tenant_document && (
                          <div>
                            <p className="text-sm text-muted-foreground">Documento</p>
                            <p className="font-medium">{invoice.contracts.tenant_document}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Co-Tenants */}
                    {invoice.contracts?.co_tenants && Array.isArray(invoice.contracts.co_tenants) && invoice.contracts.co_tenants.length > 0 && (
                      <>
                        {(invoice.contracts.co_tenants as Array<{ name?: string; document?: string }>).map((coTenant, index) => (
                          <div key={index} className="bg-muted/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-secondary/50 text-secondary-foreground px-2 py-0.5 rounded">Co-inquilino</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {coTenant.name && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Nome</p>
                                  <p className="font-medium">{coTenant.name}</p>
                                </div>
                              )}
                              {coTenant.document && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Documento</p>
                                  <p className="font-medium">{coTenant.document}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Values Breakdown */}
                <div>
                  <h3 className="font-semibold mb-3">Detalhamento de Valores</h3>
                  <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span>Aluguel</span>
                      <span className="font-medium">
                        R$ {Number(invoice.rental_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {Number(invoice.water_amount) > 0 && (
                      <div className="flex justify-between">
                        <span>Água</span>
                        <span className="font-medium">
                          R$ {Number(invoice.water_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(invoice.electricity_amount) > 0 && (
                      <div className="flex justify-between">
                        <span>Energia</span>
                        <span className="font-medium">
                          R$ {Number(invoice.electricity_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(invoice.gas_amount) > 0 && (
                      <div className="flex justify-between">
                        <span>Gás</span>
                        <span className="font-medium">
                          R$ {Number(invoice.gas_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(invoice.internet_amount) > 0 && (
                      <div className="flex justify-between">
                        <span>Internet</span>
                        <span className="font-medium">
                          R$ {Number(invoice.internet_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(invoice.condo_fee) > 0 && (
                      <div className="flex justify-between">
                        <span>Condomínio</span>
                        <span className="font-medium">
                          R$ {Number(invoice.condo_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(invoice.cleaning_fee) > 0 && (
                      <div className="flex justify-between">
                        <span>Estacionamento</span>
                        <span className="font-medium">
                          R$ {Number(invoice.cleaning_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(invoice.guarantee_installment) > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Parcela Garantia
                          {invoice.guarantee_installment_number > 0 && ` (${invoice.guarantee_installment_number}/${invoice.contracts?.guarantee_installments || invoice.guarantee_installment_number})`}
                        </span>
                        <span className="font-medium">
                          R$ {Number(invoice.guarantee_installment).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    
                    {/* Extra Charges */}
                    {invoice.extra_charges && Array.isArray(invoice.extra_charges) && invoice.extra_charges.length > 0 && (
                      <>
                        <Separator className="my-2" />
                        <div className="space-y-2">
                          <p className="font-semibold text-sm">Cobranças Adicionais</p>
                          {invoice.extra_charges.map((charge: any) => (
                            <div key={charge.id} className="flex justify-between pl-4">
                              <span className="text-sm">
                                {charge.description}
                                {charge.installment_number && ` (${charge.installment_number}x)`}
                              </span>
                              <span className="font-medium text-sm">
                                R$ {Number(charge.value_per_installment).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Discount */}
                    {Number(invoice.discount) > 0 && (
                      <>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-green-600">
                          <span>
                            Desconto
                            {invoice.discount_description && ` (${invoice.discount_description})`}
                          </span>
                          <span className="font-medium">
                            - R$ {Number(invoice.discount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <Separator className="my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>
                        R$ {Number(invoice.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-medium">
                    {invoice.payment_method === "bank_transfer" ? "Transferência Bancária" :
                     invoice.payment_method === "pix" ? "PIX" :
                     invoice.payment_method || "-"}
                  </p>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm bg-muted/50 p-3 rounded">{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contract Link */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Contrato Vinculado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to={`/contratos/${invoice.contracts?.id}`}>
                  <Button variant="outline" className="w-full">
                    Ver Contrato {invoice.contracts?.contract_number || ''}
                  </Button>
                </Link>
              </CardContent>
            </Card>

          {/* Edit Invoice Dialog */}
          <EditInvoiceDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            invoice={invoice}
            tenantCount={
              1 + (invoice.contracts?.co_tenants && Array.isArray(invoice.contracts.co_tenants) 
                ? invoice.contracts.co_tenants.length 
                : 0)
            }
          />
      </div>
    </AppLayout>
  );
};

export default InvoiceDetails;
