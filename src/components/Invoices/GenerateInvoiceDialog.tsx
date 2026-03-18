import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export function GenerateInvoiceDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [referenceMonth, setReferenceMonth] = useState<Date>(new Date());

  const { data: contracts } = useQuery({
    queryKey: ["active-contracts", user?.id],
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
        
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const selectedContractData = contracts?.find(c => c.id === selectedContract);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await supabase.functions.invoke('generate-invoices', {
        body: {
          mode: 'single',
          contract_id: selectedContract,
          reference_month: format(referenceMonth, 'yyyy-MM-dd'),
          auto_billing: false
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Fatura gerada com sucesso!",
        description: `${data.created} fatura(s) criada(s).`,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Select value={selectedContract} onValueChange={setSelectedContract}>
              <SelectTrigger id="contract">
                <SelectValue placeholder="Selecione um contrato ativo" />
              </SelectTrigger>
              <SelectContent>
                {contracts?.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.properties?.name || contract.properties?.address} - {contract.tenant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <span className="text-muted-foreground">Dia de Vencimento:</span>
                  <span className="font-medium">{selectedContractData.payment_day || 5}</span>
                </div>
                {selectedContractData.pre_paid && (
                  <div className="flex justify-between text-primary">
                    <span>Pré-pago:</span>
                    <span className="font-medium">Sim</span>
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
