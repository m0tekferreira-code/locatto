import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

interface BillingPlan {
  id: string;
  name: string;
  price_cents: number;
  days_duration: number;
  provider: string;
  provider_link: string;
  created_at: string;
}

const emptyForm = {
  id: "",
  name: "",
  price_cents: "",
  days_duration: "30",
  provider: "cakto",
  provider_link: "",
};

const AdminPlans = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("billing_plans")
        .select("*")
        .order("price_cents");

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os planos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (plan: BillingPlan) => {
    setEditingPlan(plan);
    setForm({
      id: plan.id,
      name: plan.name,
      price_cents: String(plan.price_cents),
      days_duration: String(plan.days_duration),
      provider: plan.provider,
      provider_link: plan.provider_link,
    });
    setDialogOpen(true);
  };

  const openDelete = (planId: string) => {
    setDeletingPlanId(planId);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.id.trim() || !form.name.trim() || !form.provider_link.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha ID, nome e link do provedor.",
        variant: "destructive",
      });
      return;
    }

    const priceCents = parseInt(form.price_cents, 10);
    const daysDuration = parseInt(form.days_duration, 10);

    if (isNaN(priceCents) || priceCents < 0) {
      toast({ title: "Erro", description: "Preço inválido.", variant: "destructive" });
      return;
    }
    if (isNaN(daysDuration) || daysDuration <= 0) {
      toast({ title: "Erro", description: "Duração inválida.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id.trim().toLowerCase(),
        name: form.name.trim(),
        price_cents: priceCents,
        days_duration: daysDuration,
        provider: form.provider.trim() || "cakto",
        provider_link: form.provider_link.trim(),
      };

      let error;
      if (editingPlan) {
        ({ error } = await supabase
          .from("billing_plans")
          .update({
            name: payload.name,
            price_cents: payload.price_cents,
            days_duration: payload.days_duration,
            provider: payload.provider,
            provider_link: payload.provider_link,
          })
          .eq("id", editingPlan.id));
      } else {
        ({ error } = await supabase.from("billing_plans").insert(payload));
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: editingPlan ? "Plano atualizado." : "Plano criado.",
      });
      setDialogOpen(false);
      await fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível salvar o plano.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlanId) return;
    try {
      const { error } = await supabase
        .from("billing_plans")
        .delete()
        .eq("id", deletingPlanId);

      if (error) throw error;

      toast({ title: "Plano removido", description: "O plano foi excluído." });
      setDeleteDialogOpen(false);
      await fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível excluir o plano.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      cents / 100
    );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR");

  return (
    <AppLayout title="Gestão de Planos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
            <p className="text-muted-foreground">
              Gerencie os planos de assinatura disponíveis na plataforma
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-end mb-4">
              <Button onClick={fetchPlans} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">Carregando planos...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>NOME</TableHead>
                    <TableHead>PREÇO</TableHead>
                    <TableHead>DURAÇÃO</TableHead>
                    <TableHead>PROVEDOR</TableHead>
                    <TableHead>LINK</TableHead>
                    <TableHead>CRIADO EM</TableHead>
                    <TableHead className="w-24">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        Nenhum plano cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {plan.id}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{formatCurrency(plan.price_cents)}</TableCell>
                        <TableCell>{plan.days_duration} dias</TableCell>
                        <TableCell className="capitalize">{plan.provider}</TableCell>
                        <TableCell>
                          <a
                            href={plan.provider_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Link
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(plan.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(plan)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDelete(plan.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Atualize as informações do plano."
                : "Preencha os dados para criar um novo plano."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="plan-id">ID (slug único)</Label>
              <Input
                id="plan-id"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="ex: mensal, anual"
                disabled={!!editingPlan}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-name">Nome</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: Plano Mensal"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="plan-price">Preço (centavos)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  value={form.price_cents}
                  onChange={(e) => setForm({ ...form, price_cents: e.target.value })}
                  placeholder="ex: 14900"
                />
                {form.price_cents && !isNaN(parseInt(form.price_cents)) && (
                  <p className="text-xs text-muted-foreground">
                    = {formatCurrency(parseInt(form.price_cents))}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-days">Duração (dias)</Label>
                <Input
                  id="plan-days"
                  type="number"
                  min={1}
                  value={form.days_duration}
                  onChange={(e) => setForm({ ...form, days_duration: e.target.value })}
                  placeholder="ex: 30"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-provider">Provedor</Label>
              <Input
                id="plan-provider"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="cakto"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-link">Link de Pagamento</Label>
              <Input
                id="plan-link"
                value={form.provider_link}
                onChange={(e) => setForm({ ...form, provider_link: e.target.value })}
                placeholder="https://pay.cakto.com.br/..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingPlan ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Contas que usam este plano perderão a
              referência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AdminPlans;
