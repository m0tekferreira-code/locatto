import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { useToast } from "@/hooks/use-toast";

const CONTACT_TYPES = [
  { value: "inquilino", label: "Inquilino" },
  { value: "ex_inquilino", label: "Ex-Inquilino" },
  { value: "lead", label: "Lead / Interessado" },
  { value: "fiador", label: "Fiador" },
  { value: "proprietario", label: "Proprietário" },
];

interface ContactFormDialogProps {
  onSuccess?: () => void;
  editContact?: {
    id: string;
    name: string;
    contact_type: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    status: string | null;
  } | null;
  trigger?: React.ReactNode;
}

export function ContactFormDialog({ onSuccess, editContact, trigger }: ContactFormDialogProps) {
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: editContact?.name || "",
    contact_type: editContact?.contact_type || "inquilino",
    document: editContact?.document || "",
    phone: editContact?.phone || "",
    email: editContact?.email || "",
    address: editContact?.address || "",
    notes: editContact?.notes || "",
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user || !form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (!accountId) {
      toast({
        title: "Conta não vinculada",
        description: "Conclua o cadastro da conta antes de criar contatos.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const data = {
      name: form.name.trim(),
      contact_type: form.contact_type,
      document: form.document.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      user_id: user.id,
      account_id: accountId,
    };

    let error;
    if (editContact) {
      ({ error } = await supabase.from("contacts").update(data).eq("id", editContact.id));
    } else {
      ({ error } = await supabase.from("contacts").insert(data));
    }

    setSaving(false);

    if (error) {
      console.error("Error saving contact:", error);
      const message = String(error.message || "").toLowerCase();
      const isPermissionError =
        message.includes("row-level security") ||
        message.includes("permission denied") ||
        message.includes("forbidden");

      toast({
        title: "Erro ao salvar contato",
        description: isPermissionError
          ? "Sem permissão no banco para inserir contatos. Aplique a migration de fix de contacts no Supabase e tente novamente."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: editContact ? "Contato atualizado" : "Contato criado com sucesso" });
    setOpen(false);
    setForm({ name: "", contact_type: "inquilino", document: "", phone: "", email: "", address: "", notes: "" });
    onSuccess?.();
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && editContact) {
      setForm({
        name: editContact.name || "",
        contact_type: editContact.contact_type || "inquilino",
        document: editContact.document || "",
        phone: editContact.phone || "",
        email: editContact.email || "",
        address: editContact.address || "",
        notes: editContact.notes || "",
      });
    }
    if (!isOpen && !editContact) {
      setForm({ name: "", contact_type: "inquilino", document: "", phone: "", email: "", address: "", notes: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contato
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editContact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="Nome completo" />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Contato *</Label>
            <Select value={form.contact_type} onValueChange={v => handleChange("contact_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document">CPF/CNPJ</Label>
              <Input id="document" value={form.document} onChange={e => handleChange("document", e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="email@exemplo.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" value={form.address} onChange={e => handleChange("address", e.target.value)} placeholder="Rua, número, bairro, cidade" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={form.notes} onChange={e => handleChange("notes", e.target.value)} placeholder="Observações sobre o contato" rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Salvando..." : editContact ? "Salvar" : "Criar Contato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
