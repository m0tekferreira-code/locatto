import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { useToast } from "@/hooks/use-toast";

interface CsvRow {
  [key: string]: string;
}

interface ImportResult {
  row: number;
  name: string;
  status: "imported" | "duplicate" | "error";
  message?: string;
}

function isRlsOrPermissionError(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("forbidden")
  );
}

const REQUIRED_FIELDS = ["name", "contact_type"];

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  contact_type: "Tipo",
  document: "CPF/CNPJ",
  phone: "Telefone",
  email: "Email",
  address: "Endereço",
  status: "Status",
  notes: "Observações",
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Handle quoted fields with commas inside
  const splitLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_").replace(/^\uFEFF/, ""));

  return lines.slice(1).map(line => {
    const values = splitLine(line);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || "").replace(/^"|"$/g, "");
    });
    return row;
  });
}

export function ImportContactsDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length > 0) {
        setCsvData(rows);
        setHeaders(Object.keys(rows[0]));
        setResults([]);
      } else {
        toast({ title: "Arquivo inválido", description: "O CSV não contém dados válidos.", variant: "destructive" });
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const missingFields = REQUIRED_FIELDS.filter(f => !headers.includes(f));

  const handleImport = async () => {
    if (!user || missingFields.length > 0) return;

    if (!accountId) {
      toast({
        title: "Conta não vinculada",
        description: "Conclua o cadastro da conta antes de importar contatos.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    const importResults: ImportResult[] = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const doc = row.document?.trim();

      // Check for duplicate by document if provided
      if (doc) {
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("account_id", accountId)
          .eq("document", doc)
          .maybeSingle();

        if (existing) {
          importResults.push({ row: i + 1, name: row.name || "", status: "duplicate", message: `CPF/CNPJ ${doc} já cadastrado` });
          continue;
        }
      }

      const contact = {
        user_id: user.id,
        account_id: accountId,
        name: row.name?.trim() || "",
        contact_type: row.contact_type?.trim() || "inquilino",
        document: doc || null,
        phone: row.phone?.trim() || null,
        email: row.email?.trim() || null,
        address: row.address?.trim() || null,
        status: row.status?.trim() || "active",
        notes: row.notes?.trim() || null,
      };

      const { error } = await supabase.from("contacts").insert(contact);
      if (error) {
        importResults.push({ row: i + 1, name: row.name || "", status: "error", message: error.message });

        if (isRlsOrPermissionError(error.message)) {
          importResults.push({
            row: i + 1,
            name: row.name || "",
            status: "error",
            message: "Importação interrompida por falta de permissão no banco (RLS).",
          });
          break;
        }
      } else {
        importResults.push({ row: i + 1, name: row.name || "", status: "imported" });
      }
    }

    setResults(importResults);
    setImporting(false);
    onSuccess?.();

    const imported = importResults.filter(r => r.status === "imported").length;
    const duplicates = importResults.filter(r => r.status === "duplicate").length;
    const errors = importResults.filter(r => r.status === "error").length;

    toast({
      title: "Importação concluída",
      description: `${imported} importado(s), ${duplicates} duplicado(s), ${errors} erro(s).`,
      variant: errors > 0 ? "destructive" : "default",
    });
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setCsvData([]);
      setHeaders([]);
      setResults([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = Object.keys(FIELD_LABELS).join(",");
    const exampleRow = 'João Silva,inquilino,123.456.789-00,(41) 99999-9999,joao@email.com,"Rua das Flores, 123, Centro, Curitiba, PR",active,Observações aqui';
    const csv = `${templateHeaders}\n${exampleRow}`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_contatos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Contatos via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Baixar modelo CSV
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Colunas obrigatórias: <strong>{REQUIRED_FIELDS.map(f => FIELD_LABELS[f] || f).join(", ")}</strong>.
              Duplicados por CPF/CNPJ serão ignorados automaticamente.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
          </div>

          {missingFields.length > 0 && csvData.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Colunas obrigatórias ausentes: <strong>{missingFields.join(", ")}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Results feedback */}
          {results.length > 0 && (
            <div className="border rounded-md overflow-x-auto max-h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-12">#</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1">{r.row}</TableCell>
                      <TableCell className="text-xs py-1">{r.name}</TableCell>
                      <TableCell className="text-xs py-1">
                        {r.status === "imported" && (
                          <Badge variant="default" className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Importado
                          </Badge>
                        )}
                        {r.status === "duplicate" && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <AlertCircle className="h-3 w-3" /> {r.message}
                          </Badge>
                        )}
                        {r.status === "error" && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <XCircle className="h-3 w-3" /> {r.message}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Preview */}
          {csvData.length > 0 && results.length === 0 && (
            <>
              <p className="text-sm font-medium">Pré-visualização ({csvData.length} registro(s)):</p>
              <div className="border rounded-md overflow-x-auto max-h-[250px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.slice(0, 6).map(h => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">{FIELD_LABELS[h] || h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 15).map((row, i) => (
                      <TableRow key={i}>
                        {headers.slice(0, 6).map(h => (
                          <TableCell key={h} className="text-xs py-1">{row[h] || "-"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {csvData.length > 15 && (
                <p className="text-xs text-muted-foreground">Mostrando 15 de {csvData.length} registros.</p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button
            onClick={handleImport}
            disabled={csvData.length === 0 || missingFields.length > 0 || importing || results.length > 0}
          >
            {importing ? "Importando..." : `Importar ${csvData.length} contato(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
