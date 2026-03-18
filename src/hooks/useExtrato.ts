import { useState, useCallback } from "react";
import { parseExtrato, prepararPayloadIA, aplicarRespostaIA, type LinhaParsed, type RespostaIA } from "@/lib/parseExtrato";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { toast } from "sonner";

interface ContratoContexto {
  id: string;
  inquilino: string;
  documento: string | null;
  valor_aluguel: number;
  dia_vencimento: number | null;
  imovel_nome: string | null;
}

export function useExtrato() {
  const { accountId } = useAccountId();
  const [linhas, setLinhas] = useState<LinhaParsed[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<"idle"|"parse"|"ia"|"revisao">("idle");
  const [contratos, setContratos] = useState<ContratoContexto[]>([]);
  const [salvandoAlias, setSalvandoAlias] = useState<string | null>(null);

  function normalizeName(name: string): string {
    return name.replace(/\s+/g, ' ').trim();
  }

  async function buscarClientesEFaturas() {
    // Fetch active contracts with tenant info and property name
    const { data: contratos } = await supabase
      .from("contracts")
      .select("id, tenant_name, tenant_document, rental_value, payment_day, property_id, status, properties(name)")
      .eq("status", "active");

    // Fetch pending/overdue invoices
    const { data: faturas } = await supabase
      .from("invoices")
      .select("id, contract_id, reference_month, due_date, total_amount, status, invoice_number")
      .in("status", ["pending", "overdue"]);

    return {
      contratos: (contratos || []).map((c: any) => ({
        id: c.id,
        inquilino: normalizeName(c.tenant_name),
        documento: c.tenant_document,
        valor_aluguel: c.rental_value,
        dia_vencimento: c.payment_day,
        imovel_nome: c.properties?.name || null,
      })),
      faturas_abertas: (faturas || []).map(f => ({
        id: f.id,
        contrato_id: f.contract_id,
        mes_referencia: f.reference_month,
        vencimento: f.due_date,
        valor: f.total_amount,
        status: f.status,
        numero: f.invoice_number,
      })),
    };
  }

  async function salvarAlias(nomeExtrato: string, contractId: string, tenantName: string, linhaId: string) {
    if (!accountId) {
      toast.error("Conta não encontrada");
      return;
    }
    setSalvandoAlias(linhaId);
    try {
      const { error } = await supabase
        .from("extrato_aliases" as any)
        .upsert({
          account_id: accountId,
          nome_extrato: nomeExtrato.toLowerCase().trim(),
          contract_id: contractId,
          tenant_name: tenantName,
          updated_at: new Date().toISOString(),
        }, { onConflict: "account_id,nome_extrato" });

      if (error) throw error;

      // Update the line locally
      setLinhas(prev => prev.map(l =>
        l.id === linhaId
          ? { ...l, inquilino_matched: tenantName, contrato_id: contractId }
          : l
      ));
      toast.success(`"${nomeExtrato}" vinculado a ${tenantName}`);
    } catch (e) {
      console.error("Erro ao salvar alias:", e);
      toast.error("Erro ao salvar atribuição");
    } finally {
      setSalvandoAlias(null);
    }
  }

  async function importarArquivo(file: File) {
    setErro(null); setCarregando(true);
    try {
      setEtapa("parse");
      const parsed = await parseExtrato(file);
      setLinhas(parsed);

      setEtapa("ia");
      const payload = prepararPayloadIA(parsed);
      const pagamentos = JSON.parse(payload);

      // Fetch client and invoice context
      const contexto = await buscarClientesEFaturas();
      setContratos(contexto.contratos);

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "analisar-extrato",
        { body: { pagamentos, contexto } }
      );

      if (fnError) throw new Error(fnError.message);
      const respostas: RespostaIA[] = fnData.resultado;
      setLinhas(aplicarRespostaIA(parsed, respostas));
      setEtapa("revisao");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
      setEtapa("idle");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarLinha(id: string, campos: Partial<LinhaParsed>) {
    setLinhas((prev) => prev.map((l) => l.id === id ? { ...l, ...campos } : l));
  }

  const naoIdentificados = linhas.filter((l) => !l.inquilino_matched && l.status !== "NAO_ALUGUEL");

  const resumo = {
    total: linhas.length,
    criticos: linhas.filter((l) => l.prioridade === "CRITICO").length,
    comMulta: linhas.filter((l) => l.multa_devida > 0).length,
    totalMultas: linhas.reduce((acc, l) => acc + l.multa_devida, 0),
    baixasFeitas: linhas.filter((l) => l.baixa_realizada).length,
    naoIdentificados: naoIdentificados.length,
  };

  return { linhas, carregando, erro, etapa, resumo, contratos, salvandoAlias, importarArquivo, atualizarLinha, salvarAlias };
}
