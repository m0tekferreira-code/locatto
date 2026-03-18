import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, MoreVertical, Pencil, Trash2, Eye, MessageCircle } from "lucide-react";
import { ContactFormDialog } from "@/components/Contacts/ContactFormDialog";
import { ImportContactsDialog } from "@/components/Contacts/ImportContactsDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { useToast } from "@/hooks/use-toast";

const TYPE_LABELS: Record<string, string> = {
  inquilino: "Inquilino",
  ex_inquilino: "Ex-Inquilino",
  lead: "Lead",
  fiador: "Fiador",
  proprietario: "Proprietário",
};

const TYPE_COLORS: Record<string, string> = {
  inquilino: "default",
  ex_inquilino: "secondary",
  lead: "outline",
  fiador: "secondary",
  proprietario: "default",
};

function formatPhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

const ContactsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accountId, loading: accountLoading } = useAccountId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("account_id", accountId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!accountId && !accountLoading,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contato excluído" });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const filtered = contacts?.filter(c => {
    const matchesSearch = !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || c.contact_type === typeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  return (
    <AppLayout title="Contatos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
            <p className="text-muted-foreground">Gerencie inquilinos, proprietários, fiadores e leads.</p>
          </div>
          <div className="flex gap-2">
            <ImportContactsDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["contacts"] })} />
            <ContactFormDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["contacts"] })} />
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, CPF ou email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="inquilino">Inquilino</SelectItem>
                  <SelectItem value="ex_inquilino">Ex-Inquilino</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="fiador">Fiador</SelectItem>
                  <SelectItem value="proprietario">Proprietário</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum contato encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(contact => (
                      <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/contatos/${contact.id}`)}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>
                          <Badge variant={TYPE_COLORS[contact.contact_type] as any || "secondary"}>
                            {TYPE_LABELS[contact.contact_type] || contact.contact_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{contact.document || "-"}</TableCell>
                        <TableCell className="text-sm">{contact.phone || "-"}</TableCell>
                        <TableCell className="text-sm">{contact.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={contact.status === "active" ? "default" : "secondary"}>
                            {contact.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/contatos/${contact.id}`)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                              </DropdownMenuItem>
                              {contact.phone && (
                                <DropdownMenuItem onClick={() => window.open(`https://wa.me/55${formatPhone(contact.phone)}`, "_blank")}>
                                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(contact.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default ContactsList;
