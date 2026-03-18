import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, MessageCircle, FileText } from "lucide-react";
import { ContactFormDialog } from "@/components/Contacts/ContactFormDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";

const TYPE_LABELS: Record<string, string> = {
  inquilino: "Inquilino",
  ex_inquilino: "Ex-Inquilino",
  lead: "Lead",
  fiador: "Fiador",
  proprietario: "Proprietário",
};

function formatPhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

const ContactDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accountId, loading: accountLoading } = useAccountId();
  const queryClient = useQueryClient();

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Linked contracts by tenant_name ILIKE
  const { data: linkedContracts } = useQuery({
    queryKey: ["contact-contracts", contact?.name, accountId],
    queryFn: async () => {
      if (!contact?.name || !accountId) return [];
      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_number, tenant_name, rental_value, start_date, end_date, status")
        .eq("account_id", accountId)
        .ilike("tenant_name", `%${contact.name}%`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact?.name && !!accountId && !accountLoading,
  });

  if (isLoading) {
    return (
      <AppLayout title="Contato">
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      </AppLayout>
    );
  }

  if (!contact) {
    return (
      <AppLayout title="Contato">
        <p className="text-center text-muted-foreground py-8">Contato não encontrado.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Detalhes do Contato">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/contatos")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{contact.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge>{TYPE_LABELS[contact.contact_type] || contact.contact_type}</Badge>
                <Badge variant={contact.status === "active" ? "default" : "secondary"}>
                  {contact.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {contact.phone && (
              <Button variant="outline" onClick={() => window.open(`https://wa.me/55${formatPhone(contact.phone)}`, "_blank")}>
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
              </Button>
            )}
            <ContactFormDialog
              editContact={contact}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["contact", id] })}
              trigger={
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
              }
            />
          </div>
        </div>

        {/* Contact info */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Cadastrais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                <p className="font-medium">{contact.document || "Não informado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{contact.phone || "Não informado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{contact.email || "Não informado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-medium">{contact.address || "Não informado"}</p>
              </div>
              {contact.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{contact.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Linked contracts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contratos Vinculados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!linkedContracts || linkedContracts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum contrato vinculado encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Contrato</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedContracts.map(c => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/contratos/${c.id}`)}>
                      <TableCell>{c.contract_number || "-"}</TableCell>
                      <TableCell>{c.tenant_name}</TableCell>
                      <TableCell>R$ {Number(c.rental_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell>{c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>
                          {c.status === "active" ? "Ativo" : c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ContactDetails;
