import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CalendarIcon, Pencil, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExtraCharge {
  id: string;
  description: string;
  charge_type: string;
  frequency: string;
  start_date: string;
  installments: number | null;
  charge_until_end: boolean;
  value_per_installment: number;
  total_value: number;
  created_at: string;
  status: string;
}

interface ExtraChargesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  contractEndDate: string | null;
  existingCharges: ExtraCharge[];
  onUpdate: () => void;
}

const chargeTypeLabels: Record<string, string> = {
  guarantee: "Garantia/Caução",
  iptu: "IPTU",
  condo_fee: "Condomínio",
  insurance: "Seguro",
  water: "Água",
  electricity: "Luz",
  gas: "Gás",
  internet: "Internet",
  other: "Outros",
};

const frequencyLabels: Record<string, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  one_time: "Única",
};

const extraChargeSchema = z.object({
  description: z.string().min(3, "Descrição muito curta").max(100, "Máximo 100 caracteres"),
  charge_type: z.enum([
    'guarantee', 'iptu', 'condo_fee', 'insurance', 
    'water', 'electricity', 'gas', 'internet', 'other'
  ]),
  frequency: z.enum(['monthly', 'yearly', 'one_time']),
  start_date: z.date({ required_error: "Data de início é obrigatória" }),
  installments: z.number().min(1).optional().nullable(),
  charge_until_end: z.boolean().default(false),
  value_per_installment: z.number().min(0.01, "Valor deve ser maior que zero"),
}).refine((data) => {
  if (!data.charge_until_end && !data.installments) {
    return false;
  }
  return true;
}, {
  message: "Número de parcelas é obrigatório se não cobrar até o fim do contrato",
  path: ["installments"],
});

type ExtraChargeFormData = z.infer<typeof extraChargeSchema>;

export function ExtraChargesDialog({
  open,
  onOpenChange,
  contractId,
  contractEndDate,
  existingCharges,
  onUpdate,
}: ExtraChargesDialogProps) {
  const [editingCharge, setEditingCharge] = useState<ExtraCharge | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExtraChargeFormData>({
    resolver: zodResolver(extraChargeSchema),
    defaultValues: {
      description: "",
      charge_type: "other",
      frequency: "monthly",
      start_date: new Date(),
      installments: 1,
      charge_until_end: false,
      value_per_installment: 0,
    },
  });

  const chargeUntilEnd = form.watch("charge_until_end");
  const installments = form.watch("installments");
  const valuePerInstallment = form.watch("value_per_installment");

  const totalValue = chargeUntilEnd 
    ? 0 
    : (installments || 0) * valuePerInstallment;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const onSubmit = async (data: ExtraChargeFormData) => {
    setIsSubmitting(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const newCharge: ExtraCharge = {
        id: editingCharge?.id || crypto.randomUUID(),
        description: data.description,
        charge_type: data.charge_type,
        frequency: data.frequency,
        start_date: format(data.start_date, "yyyy-MM-dd"),
        installments: data.charge_until_end ? null : (data.installments || null),
        charge_until_end: data.charge_until_end,
        value_per_installment: data.value_per_installment,
        total_value: data.charge_until_end ? 0 : (data.installments || 0) * data.value_per_installment,
        created_at: editingCharge?.created_at || new Date().toISOString(),
        status: "active",
      };

      let updatedCharges: ExtraCharge[];
      if (editingCharge) {
        updatedCharges = existingCharges.map(c => 
          c.id === editingCharge.id ? newCharge : c
        );
      } else {
        updatedCharges = [...existingCharges, newCharge];
      }

      const { error } = await supabase
        .from("contracts")
        .update({ extra_charges: updatedCharges as any })
        .eq("id", contractId);

      if (error) throw error;

      toast.success(editingCharge ? "Cobrança atualizada com sucesso!" : "Cobrança adicionada com sucesso!");
      form.reset();
      setEditingCharge(null);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar cobrança");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (charge: ExtraCharge) => {
    setEditingCharge(charge);
    form.reset({
      description: charge.description,
      charge_type: charge.charge_type as any,
      frequency: charge.frequency as any,
      start_date: new Date(charge.start_date),
      installments: charge.installments || undefined,
      charge_until_end: charge.charge_until_end,
      value_per_installment: charge.value_per_installment,
    });
  };

  const handleDelete = async (chargeId: string) => {
    if (!confirm("Deseja realmente remover esta cobrança?")) return;

    setIsSubmitting(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const updatedCharges = existingCharges.map(c => 
        c.id === chargeId ? { ...c, status: "cancelled" } : c
      );

      const { error } = await supabase
        .from("contracts")
        .update({ extra_charges: updatedCharges as any })
        .eq("id", contractId);

      if (error) throw error;

      toast.success("Cobrança removida com sucesso!");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover cobrança");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setEditingCharge(null);
  };

  const activeCharges = existingCharges.filter(c => c.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobranças Adicionais</DialogTitle>
        </DialogHeader>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Mudanças em Cobranças Adicionais não refletem em faturas já geradas. 
            Para editar faturas já geradas, vá direto na aba faturamento, localize 
            a fatura e faça a edição. O número de parcelas: O número informado 
            corresponde a quantas vezes a cobrança será aplicada. Ex: Se colocar 
            12 de R$ 100,00, então serão 12 parcelas de R$ 100,00 no total.
            Não é o valor cheio, é sim o valor da parcela.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingCharge ? "Editar Cobrança" : "Nova Cobrança"}
              </h3>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Caução 6x" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="charge_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Cobrança</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(chargeTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a frequência" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(frequencyLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Início da Vigência</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "MM/yyyy")
                                ) : (
                                  <span>Selecione o mês</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="charge_until_end"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Cobrar até o fim do contrato
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {!chargeUntilEnd && (
                    <FormField
                      control={form.control}
                      name="installments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Parcelas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Ex: 12"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="value_per_installment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor por Parcela (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      Total: {chargeUntilEnd ? "Indeterminado" : formatCurrency(totalValue)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {editingCharge ? "Atualizar" : "Adicionar"}
                    </Button>
                    {editingCharge && (
                      <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cobranças Cadastradas</h3>
            
            {activeCharges.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Nenhuma cobrança adicional cadastrada
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCharges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell className="font-medium">{charge.description}</TableCell>
                        <TableCell>{chargeTypeLabels[charge.charge_type]}</TableCell>
                        <TableCell>{formatCurrency(charge.value_per_installment)}</TableCell>
                        <TableCell>
                          {charge.charge_until_end 
                            ? "Até o fim" 
                            : `${charge.installments}x`}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(charge)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(charge.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
