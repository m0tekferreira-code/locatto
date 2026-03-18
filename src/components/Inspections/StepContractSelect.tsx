import { useState, useMemo } from "react";
import { Search, FileText, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAccountId } from "@/hooks/useAccountId";
import type { InspectionData } from "@/pages/Inspections/InspectionWizard";
import { cn } from "@/lib/utils";

interface Props {
  data: InspectionData;
  setData: React.Dispatch<React.SetStateAction<InspectionData>>;
}

export const StepContractSelect = ({ data, setData }: Props) => {
  const [search, setSearch] = useState("");
  const { accountId, loading: accountLoading } = useAccountId();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts-active", accountId],
    enabled: !accountLoading && !!accountId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("contracts")
        .select("id, tenant_name, contract_number, property_id, properties(name, address)")
        .eq("account_id", accountId!)
        .eq("status", "active")
        .order("tenant_name");
      if (error) throw error;
      return rows || [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return contracts;
    const q = search.toLowerCase();
    return contracts.filter(
      (c: any) =>
        c.tenant_name?.toLowerCase().includes(q) ||
        c.contract_number?.toLowerCase().includes(q) ||
        (c.properties as any)?.name?.toLowerCase().includes(q) ||
        (c.properties as any)?.address?.toLowerCase().includes(q)
    );
  }, [contracts, search]);

  const selectContract = (c: any) => {
    const label = `${c.tenant_name} — ${(c.properties as any)?.name || "Sem imóvel"}`;
    setData((prev) => ({ ...prev, contractId: c.id, contractLabel: label }));
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por inquilino, nº contrato ou imóvel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-14 text-base rounded-xl"
        />
      </div>

      {isLoading || accountLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando contratos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum contrato ativo encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => {
            const isSelected = data.contractId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => selectContract(c)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                {isSelected ? (
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                ) : (
                  <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.tenant_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {(c.properties as any)?.name || "Sem imóvel"} · {c.contract_number || "S/N"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
