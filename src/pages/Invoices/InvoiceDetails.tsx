import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle, XCircle, FileText, Home, User, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
            payment_method,
            guarantee_type,
            start_date,
            end_date
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
      return data;
    },
    enabled: !!user?.id && !!id,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      const currentHistory = Array.isArray(invoice?.history) ? invoice.history : [];
      const { error } = await supabase
        .from("invoices")
        .update({ 
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
      const currentHistory = Array.isArray(invoice?.history) ? invoice.history : [];
      const { error } = await supabase
        .from("invoices")
        .update({ 
          status: "cancelled",
          history: [
            ...currentHistory,
            {
              action: 'cancelled',
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
        title: "Fatura cancelada",
        description: "A fatura foi cancelada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cancelar fatura",
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
                {(invoice.status === "pending" || invoice.status === "overdue") && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => cancelInvoiceMutation.mutate()}
                      disabled={cancelInvoiceMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar
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
                      {format(new Date(invoice.reference_month), "MMMM 'de' yyyy", { locale: ptBR })}
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
                      <p className="font-medium">{invoice.properties?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {invoice.properties?.address}, {invoice.properties?.number}
                        {invoice.properties?.complement && ` - ${invoice.properties.complement}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bairro</p>
                      <p className="font-medium">{invoice.properties?.neighborhood}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cidade</p>
                      <p className="font-medium">
                        {invoice.properties?.city} - {invoice.properties?.state}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Proprietário</p>
                      <p className="font-medium">{invoice.properties?.owner_name || "-"}</p>
                    </div>
                    {invoice.properties?.owner_contact && (
                      <div>
                        <p className="text-sm text-muted-foreground">Contato do Proprietário</p>
                        <p className="font-medium">{invoice.properties.owner_contact}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Tenant Info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Inquilino</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
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
                    {Number(invoice.guarantee_installment) > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Parcela Garantia
                          {invoice.guarantee_installment_number && ` (${invoice.guarantee_installment_number}/12)`}
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
          </div>
    </AppLayout>
  );
};

export default InvoiceDetails;
