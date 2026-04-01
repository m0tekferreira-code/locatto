import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Zap, Users } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface ExtraCharge {
  id: string;
  description: string;
  value: number;
}

interface InvoiceData {
  id: string;
  invoice_number?: string;
  due_date?: string;
  rental_amount?: number;
  water_amount?: number;
  electricity_amount?: number;
  gas_amount?: number;
  internet_amount?: number;
  cleaning_fee?: number;
  condo_fee?: number;
  discount?: number;
  discount_description?: string;
  extra_charges?: Array<{
    id?: string;
    description?: string;
    value_per_installment?: number;
    value?: number;
  }>;
  notes?: string;
  history?: Json;
}

interface EditInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData;
  tenantCount?: number;
}

// Valores padrão das cobranças
const DEFAULT_CHARGES = {
  cleaning: 50,
  water: 37,
  electricity_single: 85,
  electricity_multiple: 170,
  gas: 37,
  internet: 70,
};

export function EditInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  tenantCount = 1,
}: EditInvoiceDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [rentalAmount, setRentalAmount] = useState<number>(0);
  const [waterAmount, setWaterAmount] = useState<number>(0);
  const [electricityAmount, setElectricityAmount] = useState<number>(0);
  const [gasAmount, setGasAmount] = useState<number>(0);
  const [internetAmount, setInternetAmount] = useState<number>(0);
  const [cleaningFee, setCleaningFee] = useState<number>(0);
  const [condoFee, setCondoFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountDescription, setDiscountDescription] = useState<string>("");
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  // Helper states
  const [useMultipleTenantRate, setUseMultipleTenantRate] = useState(false);

  // Initialize form with invoice data
  useEffect(() => {
    if (invoice && open) {
      setRentalAmount(Number(invoice.rental_amount) || 0);
      setWaterAmount(Number(invoice.water_amount) || 0);
      setElectricityAmount(Number(invoice.electricity_amount) || 0);
      setGasAmount(Number(invoice.gas_amount) || 0);
      setInternetAmount(Number(invoice.internet_amount) || 0);
      setCleaningFee(Number(invoice.cleaning_fee) || 0);
      setCondoFee(Number(invoice.condo_fee) || 0);
      setDiscount(Number(invoice.discount) || 0);
      setDiscountDescription(invoice.discount_description || "");
      setNotes(invoice.notes || "");
      setDueDate(invoice.due_date || "");
      
      // Check if using multiple tenant rate
      setUseMultipleTenantRate(
        Number(invoice.electricity_amount) === DEFAULT_CHARGES.electricity_multiple || 
        tenantCount > 1
      );

      // Parse extra charges
      if (invoice.extra_charges && Array.isArray(invoice.extra_charges)) {
        setExtraCharges(
          invoice.extra_charges.map((charge, index: number) => ({
            id: charge.id || `charge-${index}`,
            description: charge.description || "",
            value: Number(charge.value_per_installment || charge.value) || 0,
          }))
        );
      } else {
        setExtraCharges([]);
      }
    }
  }, [invoice, open, tenantCount]);

  // Calculate total
  const calculateTotal = () => {
    const guaranteeInstallment = Number(invoice?.guarantee_installment) || 0;
    const charges = 
      rentalAmount +
      waterAmount +
      electricityAmount +
      gasAmount +
      internetAmount +
      cleaningFee +
      condoFee +
      guaranteeInstallment +
      extraCharges.reduce((sum, charge) => sum + charge.value, 0);
    
    return charges - discount;
  };

  // Apply default charges
  const applyDefaultCharges = () => {
    setWaterAmount(DEFAULT_CHARGES.water);
    setGasAmount(DEFAULT_CHARGES.gas);
    setInternetAmount(DEFAULT_CHARGES.internet);
    setCleaningFee(DEFAULT_CHARGES.cleaning);
    setElectricityAmount(
      useMultipleTenantRate 
        ? DEFAULT_CHARGES.electricity_multiple 
        : DEFAULT_CHARGES.electricity_single
    );
    toast({
      title: "Valores padrão aplicados",
      description: "Os valores padrão foram preenchidos nos campos.",
    });
  };

  // Toggle electricity rate based on tenant count
  const handleTenantRateToggle = (checked: boolean) => {
    setUseMultipleTenantRate(checked);
    setElectricityAmount(
      checked 
        ? DEFAULT_CHARGES.electricity_multiple 
        : DEFAULT_CHARGES.electricity_single
    );
  };

  // Add extra charge
  const addExtraCharge = () => {
    setExtraCharges([
      ...extraCharges,
      { id: `new-${Date.now()}`, description: "", value: 0 },
    ]);
  };

  // Remove extra charge
  const removeExtraCharge = (id: string) => {
    setExtraCharges(extraCharges.filter((charge) => charge.id !== id));
  };

  // Update extra charge
  const updateExtraCharge = (id: string, field: keyof ExtraCharge, value: string | number) => {
    setExtraCharges(
      extraCharges.map((charge) =>
        charge.id === id ? { ...charge, [field]: value } : charge
      )
    );
  };

  // Save mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = calculateTotal();
      const currentHistory = Array.isArray(invoice?.history) ? (invoice.history as Json[]) : [];
      
      const newHistoryEntry: Json = {
        action: 'updated',
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        changes: { total_amount: totalAmount },
      };

      const { error } = await supabase
        .from("invoices")
        .update({
          due_date: dueDate || undefined,
          rental_amount: rentalAmount,
          water_amount: waterAmount,
          electricity_amount: electricityAmount,
          gas_amount: gasAmount,
          internet_amount: internetAmount,
          cleaning_fee: cleaningFee,
          condo_fee: condoFee,
          discount: discount,
          discount_description: discountDescription || null,
          extra_charges: extraCharges.length > 0 
            ? extraCharges.map(charge => ({
                id: charge.id,
                description: charge.description,
                value_per_installment: charge.value,
              }))
            : null,
          total_amount: totalAmount,
          notes: notes || null,
          updated_at: new Date().toISOString(),
          history: [...currentHistory, newHistoryEntry],
        })
        .eq("id", invoice.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Fatura atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Fatura {invoice?.invoice_number}</DialogTitle>
          <DialogDescription>
            Atualize os valores e detalhes da cobrança
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Data de Vencimento</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyDefaultCharges}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aplicar Valores Padrão
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id="tenant-rate"
                checked={useMultipleTenantRate}
                onCheckedChange={handleTenantRateToggle}
              />
              <Label htmlFor="tenant-rate" className="flex items-center gap-1 text-sm">
                <Users className="h-4 w-4" />
                Mais de 1 inquilino (Luz: R$ 170)
              </Label>
            </div>
          </div>

          <Separator />

          {/* Main Charges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rental">Aluguel</Label>
              <Input
                id="rental"
                type="number"
                step="0.01"
                value={rentalAmount}
                onChange={(e) => setRentalAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="condo">Condomínio</Label>
              <Input
                id="condo"
                type="number"
                step="0.01"
                value={condoFee}
                onChange={(e) => setCondoFee(Number(e.target.value))}
              />
            </div>
          </div>

          <Separator />

          {/* Utilities */}
          <div>
            <h4 className="font-medium mb-3">Consumo / Taxas</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cleaning">Estacionamento</Label>
                <Input
                  id="cleaning"
                  type="number"
                  step="0.01"
                  value={cleaningFee}
                  onChange={(e) => setCleaningFee(Number(e.target.value))}
                  placeholder="50,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="water">Água</Label>
                <Input
                  id="water"
                  type="number"
                  step="0.01"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(Number(e.target.value))}
                  placeholder="37,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="electricity" className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  Luz
                  {useMultipleTenantRate && (
                    <Badge variant="outline" className="ml-1 text-xs">+1 pessoa</Badge>
                  )}
                </Label>
                <Input
                  id="electricity"
                  type="number"
                  step="0.01"
                  value={electricityAmount}
                  onChange={(e) => setElectricityAmount(Number(e.target.value))}
                  placeholder={useMultipleTenantRate ? "170,00" : "85,00"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas">Gás</Label>
                <Input
                  id="gas"
                  type="number"
                  step="0.01"
                  value={gasAmount}
                  onChange={(e) => setGasAmount(Number(e.target.value))}
                  placeholder="37,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internet">Internet</Label>
                <Input
                  id="internet"
                  type="number"
                  step="0.01"
                  value={internetAmount}
                  onChange={(e) => setInternetAmount(Number(e.target.value))}
                  placeholder="70,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Extra Charges */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Cobranças Adicionais</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExtraCharge}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
            
            {extraCharges.length > 0 ? (
              <div className="space-y-3">
                {extraCharges.map((charge) => (
                  <div key={charge.id} className="flex gap-2 items-start">
                    <Input
                      placeholder="Descrição"
                      value={charge.description}
                      onChange={(e) =>
                        updateExtraCharge(charge.id, "description", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      value={charge.value}
                      onChange={(e) =>
                        updateExtraCharge(charge.id, "value", Number(e.target.value))
                      }
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExtraCharge(charge.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma cobrança adicional
              </p>
            )}
          </div>

          <Separator />

          {/* Discount */}
          <div>
            <h4 className="font-medium mb-3">Desconto</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Valor do Desconto</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountDesc">Motivo do Desconto</Label>
                <Input
                  id="discountDesc"
                  value={discountDescription}
                  onChange={(e) => setDiscountDescription(e.target.value)}
                  placeholder="Ex: Pontualidade, acordo..."
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <Separator />

          {/* Total Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Aluguel</span>
              <span>{formatCurrency(rentalAmount)}</span>
            </div>
            {condoFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Condomínio</span>
                <span>{formatCurrency(condoFee)}</span>
              </div>
            )}
            {cleaningFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Estacionamento</span>
                <span>{formatCurrency(cleaningFee)}</span>
              </div>
            )}
            {waterAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Água</span>
                <span>{formatCurrency(waterAmount)}</span>
              </div>
            )}
            {electricityAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Luz {useMultipleTenantRate && "(+1 pessoa)"}</span>
                <span>{formatCurrency(electricityAmount)}</span>
              </div>
            )}
            {gasAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Gás</span>
                <span>{formatCurrency(gasAmount)}</span>
              </div>
            )}
            {internetAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Internet</span>
                <span>{formatCurrency(internetAmount)}</span>
              </div>
            )}
            {extraCharges.map((charge) => (
              charge.value > 0 && (
                <div key={charge.id} className="flex justify-between text-sm">
                  <span>{charge.description || "Cobrança adicional"}</span>
                  <span>{formatCurrency(charge.value)}</span>
                </div>
              )
            ))}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto {discountDescription && `(${discountDescription})`}</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
