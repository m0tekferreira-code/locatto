import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { InvoiceCard } from "@/components/Responsive/InvoiceCard";
import { useIsMobile } from "@/hooks/use-mobile";

interface Invoice {
  id: string;
  contract?: { tenant_name: string };
  property?: { name: string };
  due_date: string;
  total_amount: number;
  status: string;
}

interface InvoicesTableProps {
  invoices: Invoice[];
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "secondary", label: "Pendente" },
    paid: { variant: "default", label: "Pago" },
    overdue: { variant: "destructive", label: "Vencido" },
    active: { variant: "default", label: "Ativo" },
    vigente: { variant: "default", label: "Vigente" },
    expired: { variant: "secondary", label: "Expirado" },
    terminated: { variant: "destructive", label: "Encerrado" },
    lead: { variant: "outline", label: "Lead" },
    cliente: { variant: "default", label: "Cliente" },
    prospect: { variant: "secondary", label: "Prospect" },
  };
  const config = variants[status] ?? { variant: "outline" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const EmptyRow = ({ colSpan, message }: { colSpan: number; message: string }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
      {message}
    </TableCell>
  </TableRow>
);

export const InvoicesTable = ({ invoices }: InvoicesTableProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const [activeTab, setActiveTab] = useState("cobrancas");

  const filterCol = accountId ? "account_id" : "user_id";
  const filterVal = accountId ?? user?.id;

  // Contratos tab data
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["dashboard-contracts", filterVal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, tenant_name, rental_value, start_date, end_date, status, property_id, properties(name)")
        .eq(filterCol, filterVal!)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!filterVal && activeTab === "contratos",
  });

  // Leads tab data
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["dashboard-leads", filterVal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, phone, status, created_at, contact_type")
        .eq(filterCol, filterVal!)
        .eq("contact_type", "lead")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!filterVal && activeTab === "leads",
  });

  return (
    <Card>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b px-4 pt-4 pb-0">
          <TabsList className="grid w-full grid-cols-4 max-w-md text-xs md:text-sm">
            <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="propostas">Propostas</TabsTrigger>
          </TabsList>
        </div>

        {/* ── COBRANÇAS ── */}
        <TabsContent value="cobrancas" className="m-0">
          <CardContent className="p-0">
            {isMobile ? (
              <div className="p-3 space-y-3">
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma fatura encontrada</div>
                ) : (
                  invoices.map((invoice) => (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={{ ...invoice, contracts: invoice.contract, properties: invoice.property }}
                      getStatusBadge={(status) => getStatusBadge(status)}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Imóvel</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <EmptyRow colSpan={6} message="Nenhuma fatura encontrada" />
                    ) : (
                      invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.contract?.tenant_name || "N/A"}</TableCell>
                          <TableCell className="max-w-xs truncate">{invoice.property?.name || "N/A"}</TableCell>
                          <TableCell>{format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell className="font-semibold">
                            {Number(invoice.total_amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/faturas/${invoice.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex justify-center border-t p-4">
              <Button variant="link" className="text-info" onClick={() => navigate("/faturas")}>
                VISUALIZAR TODAS AS FATURAS <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </TabsContent>

        {/* ── CONTRATOS ── */}
        <TabsContent value="contratos" className="m-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Imóvel</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Término</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsLoading ? (
                    <EmptyRow colSpan={7} message="Carregando..." />
                  ) : contracts.length === 0 ? (
                    <EmptyRow colSpan={7} message="Nenhum contrato ativo encontrado" />
                  ) : (
                    contracts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.tenant_name}</TableCell>
                        <TableCell className="max-w-xs truncate">{c.properties?.name || "N/A"}</TableCell>
                        <TableCell className="font-semibold">
                          {Number(c.rental_value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell>{c.start_date ? format(new Date(c.start_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                        <TableCell>{c.end_date ? format(new Date(c.end_date), "dd/MM/yyyy", { locale: ptBR }) : "Indet."}</TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/documentos/${c.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center border-t p-4">
              <Button variant="link" className="text-info" onClick={() => navigate("/documentos")}>
                VISUALIZAR TODOS OS CONTRATOS <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </TabsContent>

        {/* ── LEADS ── */}
        <TabsContent value="leads" className="m-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsLoading ? (
                    <EmptyRow colSpan={6} message="Carregando..." />
                  ) : leads.length === 0 ? (
                    <EmptyRow colSpan={6} message="Nenhum lead encontrado" />
                  ) : (
                    leads.map((lead: any) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.email || "—"}</TableCell>
                        <TableCell>{lead.phone || "—"}</TableCell>
                        <TableCell>{getStatusBadge(lead.status || "lead")}</TableCell>
                        <TableCell>{lead.created_at ? format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/contatos/${lead.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center border-t p-4">
              <Button variant="link" className="text-info" onClick={() => navigate("/contatos")}>
                VISUALIZAR TODOS OS CONTATOS <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </TabsContent>

        {/* ── PROPOSTAS ── */}
        <TabsContent value="propostas" className="m-0">
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <p className="text-sm">Nenhuma proposta cadastrada ainda.</p>
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
