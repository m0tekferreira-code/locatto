import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Save, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Contrato {
  id: string;
  inquilino: string;
  documento: string | null;
  valor_aluguel: number;
  dia_vencimento: number | null;
  imovel_nome?: string | null;
}

interface TenantAssignSelectProps {
  nomeExtrato: string;
  currentMatch: string | null;
  contratos: Contrato[];
  onAssign: (contratoId: string, tenantName: string) => void;
  saving?: boolean;
}

export function TenantAssignSelect({ nomeExtrato, currentMatch, contratos, onAssign, saving }: TenantAssignSelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");

  if (currentMatch) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        {currentMatch}
      </Badge>
    );
  }

  const selectedContrato = contratos.find(c => c.id === selected);

  const handleSelect = (contratoId: string) => {
    setSelected(contratoId);
    setOpen(false);
  };

  const handleAssign = () => {
    const contrato = contratos.find(c => c.id === selected);
    if (contrato) {
      onAssign(contrato.id, contrato.inquilino);
    }
  };

  return (
    <div className="flex items-center gap-1.5 min-w-[260px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 w-[220px] justify-between text-xs font-normal"
          >
            <span className="truncate">
              {selectedContrato
                ? `${selectedContrato.inquilino}${selectedContrato.imovel_nome ? ` · ${selectedContrato.imovel_nome}` : ""}`
                : "Buscar inquilino..."}
            </span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Digite o nome do inquilino..." className="h-9" />
            <CommandList>
              <CommandEmpty>Nenhum inquilino encontrado.</CommandEmpty>
              <CommandGroup>
                {contratos.map(c => (
                  <CommandItem
                    key={c.id}
                    value={`${c.inquilino} ${c.imovel_nome || ""} ${c.documento || ""}`}
                    onSelect={() => handleSelect(c.id)}
                    className="flex items-start gap-2 py-2"
                  >
                    <Check className={cn("h-4 w-4 mt-0.5 shrink-0", selected === c.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">{c.inquilino}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {c.imovel_nome ? `${c.imovel_nome} · ` : ""}
                        R$ {c.valor_aluguel?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        {c.documento ? ` · ${c.documento}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleAssign}
          disabled={saving}
          title="Salvar atribuição"
        >
          {saving ? <Save className="h-3.5 w-3.5 animate-pulse" /> : <UserCheck className="h-3.5 w-3.5 text-green-600" />}
        </Button>
      )}
    </div>
  );
}
