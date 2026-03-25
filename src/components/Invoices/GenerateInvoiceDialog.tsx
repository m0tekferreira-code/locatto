import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { toast } from "@/hooks/use-toast";

export function GenerateInvoiceDialog() {
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [contractComboOpen, setContractComboOpen] = useState(false);
  const [contractSearch, setContractSearch] = useState("");
  const [referenceMonth, setReferenceMonth] = useState<Date>(new Date());

  const { data: contracts } = useQuery({
    queryKey: ["active-contracts-for-invoice", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          properties (
            name,
            address
          )
        `)
        .eq("account_id", accountId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId && open,
  });

  const selectedContractData = contracts?.find(c => c.id === selectedContract);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user || !accountId) throw new Error("Usuário não autenticado");

      const contract = selectedContractData;
      if (!contract) throw new Error("Contrato não encontrado");

      // Normaliza para o primeiro dia do mês selecionado
      const refMonth = new Date(
        referenceMonth.getFullYear(),
        referenceMonth.getMonth(),
        1
      );
      const referenceMonthStr = format(refMonth, "yyyy-MM-dd");

      // Verifica se já existe fatura ATIVA para este contrato/mês
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("contract_id", contract.id)
        .eq("reference_month", referenceMonthStr)
        .neq("status", "cancelled")
        .maybeSingle();

      if (existing) throw new Error("Já existe uma fatura para este contrato neste mês.");

      // Calcula data de vencimento
      const paymentDay = contract.payment_day || 5;
      const dueDate = new Date(refMonth);
      if (contract.pre_paid) dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(paymentDay);
      const dueDateStr = format(dueDate, "yyyy-MM-dd");

      // Parcela de garantia
      let guaranteeInstallment = 0;
      let guaranteeInstallmentNumber: number | null = null;
      if (contract.guarantee_type && contract.guarantee_value && Number(contract.guarantee_value) > 0) {
        const startDate = new Date(contract.start_date);
        const monthsDiff =
          (refMonth.getFullYear() - startDate.getFullYear()) * 12 +
          (refMonth.getMonth() - startDate.getMonth());
        const installNum = monthsDiff + 1;
        if (installNum >= 1 && installNum <= 12) {
          guaranteeInstallment = Number(contract.guarantee_value) / 12;
          guaranteeInstallmentNumber = installNum;
        }
      }

      // Cobranças extras
      const extraCharges: object[] = [];
      let extraChargesTotal = 0;
      const rawCharges = contract.extra_charges;
      if (Array.isArray(rawCharges)) {
        for (const charge of rawCharges as any[]) {
          if (charge.status !== "active") continue;
          const chargeStart = new Date(charge.start_date ?? contract.start_date);
          const monthsDiff =
            (refMonth.getFullYear() - chargeStart.getFullYear()) * 12 +
            (refMonth.getMonth() - chargeStart.getMonth());
          if (monthsDiff < 0) continue;
          const apply =
            charge.charge_until_end
              ? !contract.end_date || refMonth <= new Date(contract.end_date)
              : charge.installments && monthsDiff < charge.installments;
          if (apply) {
            extraCharges.push({
              id: charge.id,
              description: charge.description,
              charge_type: charge.charge_type,
              value_per_installment: charge.value_per_installment,
              installment_number: monthsDiff + 1,
            });
            extraChargesTotal += Number(charge.value_per_installment);
          }
        }
      }

      const rentalAmount = Number(contract.rental_value);
      const condoFee = Number(contract.condo_fee ?? 0);
      const waterAmount = Number(contract.water_amount ?? 0);
      const electricityAmount = Number(contract.electricity_amount ?? 0);
      const gasAmount = Number(contract.gas_amount ?? 0);
      const internetAmount = Number(contract.internet_amount ?? 0);
      const cleaningFee = Number(contract.cleaning_fee ?? 0);

      const standardChargesTotal = condoFee + waterAmount + electricityAmount + gasAmount + internetAmount + cleaningFee;
      const totalAmount = rentalAmount + guaranteeInstallment + extraChargesTotal + standardChargesTotal;

      // Gera número da fatura
      const prefix = `FAT-${format(refMonth, "yyyyMM")}`;
      const { count: existingCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId)
        .like("invoice_number", `${prefix}%`);
      const invoiceNumber = `${prefix}-${String((existingCount ?? 0) + 1).padStart(4, "0")}`;

      // Insere a fatura
      const { data: inserted, error: insertError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          account_id: accountId,
          contract_id: contract.id,
          property_id: contract.property_id ?? null,
          reference_month: referenceMonthStr,
          due_date: dueDateStr,
          issue_date: format(new Date(), "yyyy-MM-dd"),
          invoice_number: invoiceNumber,
          rental_amount: rentalAmount,
          guarantee_installment: guaranteeInstallment || 0,
          guarantee_installment_number: guaranteeInstallmentNumber,
          total_amount: totalAmount,
          payment_method: contract.payment_method ?? "bank_transfer",
          status: "pending",
          condo_fee: condoFee || null,
          water_amount: waterAmount || null,
          electricity_amount: electricityAmount || null,
          gas_amount: gasAmount || null,
          internet_amount: internetAmount || null,
          cleaning_fee: cleaningFee || null,
          extra_charges: extraCharges,
          history: [{
            action: "created",
            timestamp: new Date().toISOString(),
            user_id: user.id,
            auto_generated: false,
          }],
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Cria lançamento financeiro vinculado
      const monthNames = ["janeiro","fevereiro","março","abril","maio","junho",
        "julho","agosto","setembro","outubro","novembro","dezembro"];
      await supabase.from("lancamentos_financeiros").insert({
        user_id: user.id,
        account_id: accountId,
        id_contrato: contract.id,
        id_imovel: contract.property_id ?? null,
        invoice_id: inserted.id,
        tipo: "receita",
        categoria: "Aluguel",
        descricao: `Aluguel referente a ${monthNames[refMonth.getMonth()]} de ${refMonth.getFullYear()}`,
        valor: totalAmount,
        data_vencimento: dueDateStr,
        status: "pendente",
      });

      return { created: 1, invoice_number: invoiceNumber };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
      toast({
        title: "Fatura gerada com sucesso!",
        description: `Fatura ${data.invoice_number} criada.`,
      });
      setOpen(false);
      setSelectedContract("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar fatura",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedContract) {
      toast({
        title: "Selecione um contrato",
        description: "Você precisa selecionar um contrato para gerar a fatura.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setReferenceMonth(new Date());
      setSelectedContract("");
      setContractSearch("");
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Gerar Fatura Individual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar Fatura Individual</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contract">Contrato</Label>
            <Popover open={contractComboOpen} onOpenChange={setContractComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={contractComboOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedContract
                      ? (() => {
                          const c = contracts?.find(c => c.id === selectedContract);
                          return c ? `${c.properties?.name || c.properties?.address} - ${c.tenant_name}` : "Selecione um contrato ativo";
                        })()
                      : "Selecione um contrato ativo"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar por nome ou imóvel..."
                    value={contractSearch}
                    onValueChange={setContractSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum contrato encontrado.</CommandEmpty>
                    <CommandGroup>
                      {contracts
                        ?.filter(c => {
                          if (!contractSearch || contractSearch.length < 3) return true;
                          const q = contractSearch.toLowerCase();
                          const label = `${c.properties?.name || c.properties?.address || ""} ${c.tenant_name || ""}`.toLowerCase();
                          return label.includes(q);
                        })
                        .map(contract => (
                          <CommandItem
                            key={contract.id}
                            value={`${contract.properties?.name || contract.properties?.address} - ${contract.tenant_name}`}
                            onSelect={() => {
                              setSelectedContract(contract.id);
                              setContractComboOpen(false);
                              setContractSearch("");
                            }}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", selectedContract === contract.id ? "opacity-100" : "opacity-0")}
                            />
                            {contract.properties?.name || contract.properties?.address} - {contract.tenant_name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Mês de Competência</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !referenceMonth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {referenceMonth ? format(referenceMonth, "MMMM 'de' yyyy", { locale: ptBR }) : "Selecione o mês"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={referenceMonth}
                  onSelect={(date) => date && setReferenceMonth(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedContractData && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="font-medium text-sm">Pré-visualização</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inquilino:</span>
                  <span className="font-medium">{selectedContractData.tenant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor do Aluguel:</span>
                  <span className="font-medium">
                    R$ {Number(selectedContractData.rental_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento calculado:</span>
                  <span className="font-medium">
                    {(() => {
                      const refMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
                      const dueDate = new Date(refMonth);
                      if (selectedContractData.pre_paid) dueDate.setMonth(dueDate.getMonth() + 1);
                      dueDate.setDate(selectedContractData.payment_day || 5);
                      return format(dueDate, "dd/MM/yyyy");
                    })()}
                  </span>
                </div>
                {selectedContractData.pre_paid && (
                  <div className="flex justify-between text-amber-600">
                    <span>Contrato pré-pago:</span>
                    <span className="font-medium">competência = mês anterior ao vencimento</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={!selectedContract || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Gerando..." : "Gerar Fatura"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
