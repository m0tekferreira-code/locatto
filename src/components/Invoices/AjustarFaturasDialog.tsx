import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AjustarFaturasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AjusteRow {
  faturaNumero: string;     // número do xlsx
  contratoNumero: string;   // contrato (ref only)
  competencia: string;      // ex: "03-2026" → "2026-03"
  vencimento: string;       // ex: "06/03/2026" → "2026-03-06"
  valorXlsx: number;        // valor do xlsx
  statusXlsx: "paid" | "pending" | "cancelled";

  // Dados atuais no banco
  invoiceId?: string;
  valorAtual?: number;      // total_amount atual
  statusAtual?: string;     // status atual
  competenciaAtual?: string;
  vencimentoAtual?: string;

  // Resultado
  found: boolean;
  valorDivergente: boolean;
  changes: string[];        // lista de campos que serão alterados
}

// Converte valor de célula para string
const cellToString = (cell: unknown): string => {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "number") return String(cell);
  return String(cell).trim();
};

// Parseia valor monetário em pt-BR
const parseMonetary = (raw: string | number): number => {
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  const str = String(raw).trim();
  let cleaned = str.replace(/R\$\s*/gi, "").replace(/\s/g, "");
  const hasComma = cleaned.includes(",");
  const hasPeriod = cleaned.includes(".");
  if (hasComma && hasPeriod) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  } else if (hasPeriod) {
    const afterPeriod = cleaned.slice(cleaned.indexOf(".") + 1);
    if (afterPeriod.length === 3 && !afterPeriod.includes(".")) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }
  return parseFloat(cleaned) || 0;
};

// Normaliza status do xlsx para enum do banco
const normalizeStatus = (raw: string): "paid" | "pending" | "cancelled" => {
  const lower = raw.toLowerCase().trim();
  if (lower === "pago" || lower === "paga" || lower === "paid") return "paid";
  if (lower === "cancelado" || lower === "cancelada" || lower === "cancelled") return "cancelled";
  return "pending"; // "nao pago", "não pago", "pendente", etc.
};

// Converte competência "03-2026" ou "03/2026" → "2026-03"
const parseCompetencia = (raw: string): string => {
  const str = raw.trim();
  // Formato MM-YYYY ou MM/YYYY
  const m1 = str.match(/^(\d{2})[-/](\d{4})$/);
  if (m1) return `${m1[2]}-${m1[1]}`;
  // Já está em YYYY-MM
  const m2 = str.match(/^(\d{4})-(\d{2})$/);
  if (m2) return str;
  return str;
};

// Converte vencimento "06/03/2026" → "2026-03-06"
const parseVencimento = (raw: string): string => {
  const str = raw.trim();
  // dd/MM/yyyy (com barras)
  const m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  // dd-MM-yyyy (com hífens — usuário salvou assim para evitar conversão Excel)
  const m2 = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  // yyyy-MM-dd já correto
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return str;
};

// Formata data YYYY-MM-DD → DD/MM/YYYY para exibição
const formatDate = (iso: string | undefined): string => {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})(-(\d{2}))?/);
  if (!m) return iso;
  if (m[4]) return `${m[4]}/${m[2]}/${m[1]}`;
  return `${m[2]}/${m[1]}`; // só mês/ano
};

// Formata competência YYYY-MM ou YYYY-MM-DD → MM/YYYY
const formatCompetencia = (s: string | undefined): string => {
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[2]}/${m[1]}`;
  return s;
};

const statusLabel = (s: string | undefined): string => {
  if (!s) return "";
  if (s === "paid") return "Pago";
  if (s === "pending") return "Pendente";
  if (s === "cancelled") return "Cancelado";
  if (s === "legal_collection") return "Cobrança Judicial";
  return s;
};

const statusVariant = (s: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "paid") return "default";
  if (s === "pending") return "secondary";
  if (s === "cancelled") return "destructive";
  return "outline";
};

export function AjustarFaturasDialog({ open, onOpenChange }: AjustarFaturasDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [rows, setRows] = useState<AjusteRow[]>([]);
  const [results, setResults] = useState({ updated: 0, skipped: 0, errors: [] as string[] });

  const reset = () => {
    setStep("upload");
    setIsProcessing(false);
    setProcessingMessage("");
    setRows([]);
    setResults({ updated: 0, skipped: 0, errors: [] });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const processFile = useCallback(async (rawRows: unknown[][]) => {
    const CHUNK = 500;
    const dataRows = rawRows.slice(1).filter(r => r.length > 0 && r[0]);
    if (dataRows.length === 0) { setRows([]); setStep("preview"); return; }

    // Extrai todos os números de fatura únicos
    const allNumbers = [...new Set(dataRows.map(r => cellToString(r[0])).filter(Boolean))];

    setProcessingMessage(`Consultando ${allNumbers.length} faturas no banco...`);

    // Consulta em lote
    const foundArr: { id: string; invoice_number: string | null; total_amount: number | null; status: string | null; reference_month: string | null; due_date: string | null }[] = [];
    for (let i = 0; i < allNumbers.length; i += CHUNK) {
      const chunk = allNumbers.slice(i, i + CHUNK);
      const { data: batch } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, status, reference_month, due_date")
        .in("invoice_number", chunk);
      if (batch) foundArr.push(...batch);
    }
    const invoiceMap = new Map(
      foundArr.filter(inv => inv.invoice_number).map(inv => [inv.invoice_number!, inv])
    );

    setProcessingMessage(`Processando ${dataRows.length} linhas...`);

    // Monta as linhas localmente (sem mais queries ao banco)
    const parsed: AjusteRow[] = [];
    for (const row of dataRows) {
      const faturaNumero = cellToString(row[0]);
      if (!faturaNumero) continue;

      const competenciaRaw = cellToString(row[2]);
      const vencimentoRaw = cellToString(row[3]);
      const valorRaw = row[4];
      const statusRaw = cellToString(row[5]);

      const ajuste: AjusteRow = {
        faturaNumero,
        contratoNumero: cellToString(row[1]),
        competencia: parseCompetencia(competenciaRaw),
        vencimento: parseVencimento(vencimentoRaw),
        valorXlsx: parseMonetary(typeof valorRaw === "number" ? valorRaw : cellToString(valorRaw)),
        statusXlsx: normalizeStatus(statusRaw),
        found: false,
        valorDivergente: false,
        changes: [],
      };

      const inv = invoiceMap.get(faturaNumero);
      if (inv) {
        ajuste.found = true;
        ajuste.invoiceId = inv.id;
        ajuste.valorAtual = inv.total_amount ?? undefined;
        ajuste.statusAtual = inv.status ?? undefined;
        ajuste.competenciaAtual = inv.reference_month ?? undefined;
        ajuste.vencimentoAtual = inv.due_date ?? undefined;

        const diff = Math.abs((inv.total_amount || 0) - ajuste.valorXlsx);
        ajuste.valorDivergente = diff > 0.01;

        if ((inv.reference_month ?? "").substring(0, 7) !== ajuste.competencia) ajuste.changes.push("competência");
        if (inv.due_date !== ajuste.vencimento) ajuste.changes.push("vencimento");
        if (inv.status !== ajuste.statusXlsx) ajuste.changes.push("status");
      }

      parsed.push(ajuste);
    }

    setRows(parsed);
    setStep("preview");
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingMessage("Lendo arquivo...");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
        processFile(jsonData)
          .catch(err => {
            toast({ title: "Erro ao processar arquivo", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
          })
          .finally(() => {
            setIsProcessing(false);
            setProcessingMessage("");
          });
      } catch {
        setIsProcessing(false);
        setProcessingMessage("");
        toast({ title: "Erro ao ler arquivo", description: "Verifique se é um .xlsx válido.", variant: "destructive" });
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setProcessingMessage("");
      toast({ title: "Erro ao ler arquivo", description: "Falha ao carregar o arquivo.", variant: "destructive" });
    };
    reader.readAsArrayBuffer(file);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = { updated: 0, skipped: 0, errors: [] as string[] };

      for (const row of rows) {
        if (!row.found || !row.invoiceId) {
          res.skipped++;
          res.errors.push(`Fatura ${row.faturaNumero} não encontrada no sistema`);
          continue;
        }

        if (row.changes.length === 0) {
          res.skipped++;
          continue;
        }

        try {
          const { error } = await supabase
            .from("invoices")
            .update({
              reference_month: row.competencia + "-01",
              due_date: row.vencimento,
              status: row.statusXlsx,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.invoiceId);

          if (error) throw error;
          res.updated++;
        } catch (err) {
          res.errors.push(`Fatura ${row.faturaNumero}: ${err instanceof Error ? err.message : "Erro"}`);
        }
      }

      return res;
    },
    onSuccess: (res) => {
      setResults(res);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err) => {
      toast({ title: "Erro na importação", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    },
  });

  const foundCount = rows.filter(r => r.found).length;
  const withChanges = rows.filter(r => r.found && r.changes.length > 0).length;
  const divergentes = rows.filter(r => r.valorDivergente).length;
  const notFound = rows.filter(r => !r.found).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustar Faturas via Planilha</DialogTitle>
          <DialogDescription>
            Importe um .xlsx com colunas: <strong>Fatura, Contrato, Competencia, Vencimento, Valor, Status</strong>
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed rounded-lg">
            {isProcessing ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{processingMessage || "Processando..."}</p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Selecione o arquivo Excel (.xlsx)</p>
                <label>
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Selecionar arquivo
                    </span>
                  </Button>
                </label>
                <div className="mt-4 text-xs text-muted-foreground space-y-1 text-center">
                  <p>Exemplo de estrutura esperada:</p>
                  <p className="font-mono">Fatura | Contrato | Competencia | Vencimento | Valor | Status</p>
                  <p className="font-mono">219117 | 10598 | 03-2026 | 06/03/2026 | R$ 1.357,80 | Pago</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline">{rows.length} linha(s) no arquivo</Badge>
              <Badge variant="default" className="bg-green-600">{foundCount} encontrada(s)</Badge>
              {notFound > 0 && <Badge variant="destructive">{notFound} não encontrada(s)</Badge>}
              {divergentes > 0 && <Badge variant="secondary" className="bg-yellow-500 text-white">{divergentes} valor(es) divergente(s)</Badge>}
              <Badge variant="outline">{withChanges} com alterações pendentes</Badge>
            </div>

            {divergentes > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {divergentes} fatura(s) com valor divergente entre o arquivo e o sistema. O valor em si <strong>não será alterado</strong> — apenas competência, vencimento e status serão ajustados. Revise manualmente se necessário.
                </span>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor (xlsx vs banco)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alterações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.faturaNumero} className={!row.found ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        {row.found
                          ? <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        {row.faturaNumero}
                      </div>
                      {!row.found && <span className="text-xs text-red-500">Não encontrada</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.found && (row.competenciaAtual ?? "").substring(0, 7) !== row.competencia ? (
                        <span className="text-orange-600">
                          {formatCompetencia(row.competenciaAtual)} → <strong>{formatCompetencia(row.competencia)}</strong>
                        </span>
                      ) : (
                        <span>{formatCompetencia(row.competencia)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.found && row.vencimentoAtual !== row.vencimento ? (
                        <span className="text-orange-600">
                          {formatDate(row.vencimentoAtual)} → <strong>{formatDate(row.vencimento)}</strong>
                        </span>
                      ) : (
                        <span>{formatDate(row.vencimento)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        {row.valorDivergente && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
                        <span className={row.valorDivergente ? "text-yellow-700" : ""}>
                          R$ {row.valorXlsx.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          {row.valorDivergente && row.valorAtual !== undefined && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (banco: R$ {row.valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.found && row.statusAtual !== row.statusXlsx ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant={statusVariant(row.statusAtual)} className="text-xs">{statusLabel(row.statusAtual)}</Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge variant={statusVariant(row.statusXlsx)} className="text-xs font-semibold">{statusLabel(row.statusXlsx)}</Badge>
                        </div>
                      ) : (
                        <Badge variant={statusVariant(row.statusXlsx)} className="text-xs">{statusLabel(row.statusXlsx)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {!row.found
                        ? "—"
                        : row.changes.length === 0
                          ? <span className="text-green-600">Sem alterações</span>
                          : row.changes.join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <DialogFooter>
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={withChanges === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? "Aplicando..." : `Aplicar ${withChanges} ajuste(s)`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: Done */}
        {step === "done" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="text-lg font-semibold">Ajustes aplicados!</p>
            </div>
            <div className="flex justify-center gap-4">
              <Badge variant="default" className="bg-green-600 text-base px-4 py-1">{results.updated} atualizada(s)</Badge>
              <Badge variant="secondary" className="text-base px-4 py-1">{results.skipped} sem alteração</Badge>
              {results.errors.length > 0 && (
                <Badge variant="destructive" className="text-base px-4 py-1">{results.errors.length} erro(s)</Badge>
              )}
            </div>
            {results.errors.length > 0 && (
              <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                {results.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
