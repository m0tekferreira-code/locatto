import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ImportContractDocsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface FileMatch {
  file: File;
  extractedContractNumber: string | null;
  extractedResponsibleName: string | null;
  extractedTenantName: string | null;
  extractedUnit: string | null;
  extractedStartDate: string | null;
  extractedEndDate: string | null;
  extractedStatus: string | null;
  contractId: string | null;
  contractNumber: string | null;
  tenantName: string | null;
  contactId: string | null;
  contactName: string | null;
  propertyId: string | null;
  propertyName: string | null;
  status: "pending" | "parsing" | "matched" | "unmatched" | "uploaded" | "error";
  errorMsg?: string;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDisplayName(slug: string): string {
  return slug
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Ex.: contrato_2494_ricardo_luis_mueller.pdf
function extractMetadataFromFilename(filename: string): { contractNumber: string | null; responsibleName: string | null } {
  const base = filename.replace(/\.[^.]+$/, "");
  const match = base.match(/^contrato[_-](\d+)[_-](.+)$/i);

  if (!match) {
    return { contractNumber: null, responsibleName: null };
  }

  const contractNumber = match[1];
  const rawName = match[2].replace(/[_-]+/g, " ").trim();
  const responsibleName = rawName ? toDisplayName(rawName) : null;

  return { contractNumber, responsibleName };
}

function extractTenantName(text: string): string | null {
  const normalizedText = text.replace(/\u00A0/g, " ");
  const tenantRegex = /LOCADOR(?:A|ES)?\s*[,;]?\s*e\s+de\s+outro(?:\s+lado)?\s*[,;]?\s*([^,]+),/i;
  const match = normalizedText.match(tenantRegex);
  return match ? match[1].trim() : null;
}

function extractPropertyUnit(text: string): string | null {
  const normalizedText = text.replace(/\u00A0/g, " ");
  const clauseRegex = /CL[ÁA]USULA (?:PRIMEIRA|1[ªa]|0?1)\s*(?::|-)?\s*(?:DO )?OBJETO(.*?)(?:CL[ÁA]USULA (?:SEGUNDA|2)|O im[óo]vel descrito)/is;
  const clauseMatch = normalizedText.match(clauseRegex);

  if (!clauseMatch) return null;

  const clauseText = clauseMatch[1];
  const unitRegex = /(Apartamento\s+[0-9A-Za-z]+|Bloco\s+\d+\s+AP\s+\d+|Kitnet\s+[0-9A-Za-z]+|Apto\s+[0-9A-Za-z]+)/i;
  const unitMatch = clauseText.match(unitRegex);
  return unitMatch ? unitMatch[1].trim() : null;
}

function parseContractDate(dateStr: string): string | null {
  if (!dateStr) return null;

  if (dateStr.includes("/")) {
    const [d, m, y] = dateStr.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const months: Record<string, string> = {
    janeiro: "01",
    fevereiro: "02",
    março: "03",
    marco: "03",
    abril: "04",
    maio: "05",
    junho: "06",
    julho: "07",
    agosto: "08",
    setembro: "09",
    outubro: "10",
    novembro: "11",
    dezembro: "12",
  };

  const match = dateStr.match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if (!match) return null;

  const d = match[1].padStart(2, "0");
  const m = months[match[2].toLowerCase()] || "01";
  const y = match[3];
  return `${y}-${m}-${d}`;
}

function extractDatesFromClause(text: string): { startDate: string | null; endDate: string | null } {
  const normalizedText = text.replace(/\u00A0/g, " ");
  const clauseMatch = normalizedText.match(/CL[ÁA]USULA\s+TERCEIR[OA]\s*[:-]?\s*(?:DO\s+)?PRAZO(.*?)(?:CL[ÁA]USULA\s+QUARTA)/is);

  if (!clauseMatch) {
    return { startDate: null, endDate: null };
  }

  const clauseText = clauseMatch[1];
  const datePattern = /(\d{2}\/\d{2}\/\d{4}|\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4})/gi;
  const allDates: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = datePattern.exec(clauseText)) !== null) {
    const parsed = parseContractDate(m[1]);
    if (parsed) allDates.push(parsed);
  }

  return {
    startDate: allDates[0] || null,
    endDate: allDates[1] || null,
  };
}

function determineContractStatus(endDate: string | null): string {
  if (!endDate) return "active";
  const today = new Date().toISOString().split("T")[0];
  return endDate < today ? "expired" : "active";
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  const pagesToRead = Math.min(pdf.numPages, 3);

  for (let i = 1; i <= pagesToRead; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => {
        if (typeof item === "object" && item !== null && "str" in item) {
          const value = (item as { str: unknown }).str;
          return typeof value === "string" ? value : "";
        }
        return "";
      })
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

export function ImportContractDocsDialog({ open, onOpenChange, onComplete }: ImportContractDocsDialogProps) {
  const { user } = useAuth();
  const { accountId } = useAccountId();

  const [files, setFiles] = useState<FileMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<"select" | "preview" | "done">("select");
  const [parseProgress, setParseProgress] = useState(0);

  const handleFilesSelected = useCallback(
    async (selectedFiles: FileList) => {
      if (!user?.id) return;

      setLoading(true);

      try {
        let contractsQuery = supabase
          .from("contracts")
          .select("id, contract_number, tenant_name, property_id");
        if (accountId) {
          contractsQuery = contractsQuery.eq("account_id", accountId);
        }
        const { data: contracts, error: contractsErr } = await contractsQuery;
        if (contractsErr) throw contractsErr;

        let propertiesQuery = supabase
          .from("properties")
          .select("id, name, address, neighborhood");
        if (accountId) {
          propertiesQuery = propertiesQuery.eq("account_id", accountId);
        }
        const { data: properties, error: propertiesErr } = await propertiesQuery;
        if (propertiesErr) throw propertiesErr;

        let contactsQuery = supabase
          .from("contacts")
          .select("id, name, account_id");
        if (accountId) {
          contactsQuery = contactsQuery.eq("account_id", accountId);
        }
        const { data: contacts, error: contactsErr } = await contactsQuery;
        if (contactsErr) throw contactsErr;

        const contractByNumber = new Map<string, (typeof contracts)[number]>();
        for (const c of contracts || []) {
          if (c.contract_number) contractByNumber.set(c.contract_number, c);
        }

        const contactsByNormalizedName = new Map<string, { id: string; name: string }>();
        for (const c of contacts || []) {
          if (!c.name) continue;
          const normalized = normalizeName(c.name);
          if (!contactsByNormalizedName.has(normalized)) {
            contactsByNormalizedName.set(normalized, { id: c.id, name: c.name });
          }
        }

        const findContactByName = (name: string | null): { id: string; name: string } | null => {
          if (!name) return null;
          const normalized = normalizeName(name);
          if (!normalized) return null;

          const exact = contactsByNormalizedName.get(normalized);
          if (exact) return exact;

          const tokens = normalized.split(" ").filter((t) => t.length >= 3);
          for (const [candidateKey, candidate] of contactsByNormalizedName.entries()) {
            const ok = tokens.every((t) => candidateKey.includes(t));
            if (ok) return candidate;
          }
          return null;
        };

        const fileMatches: FileMatch[] = Array.from(selectedFiles).map((file) => ({
          file,
          extractedContractNumber: null,
          extractedResponsibleName: null,
          extractedTenantName: null,
          extractedUnit: null,
          extractedStartDate: null,
          extractedEndDate: null,
          extractedStatus: null,
          contractId: null,
          contractNumber: null,
          tenantName: null,
          contactId: null,
          contactName: null,
          propertyId: null,
          propertyName: null,
          status: "pending",
        }));

        setFiles(fileMatches);
        setStep("preview");

        let parsed = 0;
        for (const fm of fileMatches) {
          fm.status = "parsing";
          setFiles([...fileMatches]);

          try {
            const metadata = extractMetadataFromFilename(fm.file.name);
            fm.extractedContractNumber = metadata.contractNumber;
            fm.extractedResponsibleName = metadata.responsibleName;

            if (!metadata.contractNumber) {
              fm.status = "unmatched";
              fm.errorMsg = "Nome do arquivo não segue o padrão contrato_2494_nome_do_responsavel.pdf";
              parsed++;
              setParseProgress(Math.round((parsed / fileMatches.length) * 100));
              setFiles([...fileMatches]);
              continue;
            }

            const text = await extractTextFromPdf(fm.file);
            const tenantNameFromPdf = extractTenantName(text);
            fm.extractedTenantName = tenantNameFromPdf;

            const responsibleName = metadata.responsibleName || tenantNameFromPdf;
            const matchedContact = findContactByName(responsibleName);
            fm.contactId = matchedContact?.id || null;
            fm.contactName = matchedContact?.name || null;

            fm.extractedUnit = extractPropertyUnit(text);
            const { startDate, endDate } = extractDatesFromClause(text);
            fm.extractedStartDate = startDate;
            fm.extractedEndDate = endDate;
            fm.extractedStatus = determineContractStatus(endDate);

            const existingContract = contractByNumber.get(metadata.contractNumber);
            if (existingContract) {
              fm.contractId = existingContract.id;
              fm.contractNumber = existingContract.contract_number;
              fm.tenantName = existingContract.tenant_name;

              if (existingContract.property_id) {
                fm.propertyId = existingContract.property_id;
                const prop = (properties || []).find((p) => p.id === existingContract.property_id);
                if (prop) fm.propertyName = prop.name || prop.address;
              }

              fm.status = "matched";
            } else {
              fm.contractNumber = metadata.contractNumber;
              fm.tenantName = responsibleName || "Inquilino";

              if (fm.extractedUnit) {
                const unit = fm.extractedUnit;
                const bMatch = unit.match(/bloco\s*(\d+)/i);
                const aMatch = unit.match(/(?:ap|apto|apartamento)\s*(\d+)/i);

                const matchedProp = (properties || []).find((p) => {
                  const addr = (p.address || "").toLowerCase();
                  if (bMatch && aMatch) {
                    const b = parseInt(bMatch[1], 10).toString();
                    const a = parseInt(aMatch[1], 10).toString();
                    const paddedA = a.length === 1 ? `0${a}` : a;
                    const combinedA = `${b}${paddedA}`;
                    const blockRegex = new RegExp(`bloco\\s*-?\\s*0?${b}\\b`, "i");
                    const apRegex = new RegExp(`(?:ap|apto|apartamento)\\s*-?\\s*(?:0?${a}|${combinedA})\\b`, "i");
                    return blockRegex.test(addr) && apRegex.test(addr);
                  }

                  const cleanUnit = unit
                    .toLowerCase()
                    .replace(/(kitnet|apartamento|apto|ap|bloco|do|residencial|pinhais)/g, "")
                    .replace(/\s+/g, "");
                  const propAddress = addr.replace(/\s+/g, "");
                  return cleanUnit.length > 0 && propAddress.includes(cleanUnit);
                });

                if (matchedProp) {
                  fm.propertyId = matchedProp.id;
                  fm.propertyName = matchedProp.name || matchedProp.address;
                }
              }

              fm.status = "matched";
              fm.tenantName = `${fm.tenantName} (contrato será criado)`;
            }
          } catch (err: unknown) {
            fm.status = "error";
            const message = err instanceof Error ? err.message : "desconhecido";
            fm.errorMsg = "Erro ao ler PDF: " + message;
          }

          parsed++;
          setParseProgress(Math.round((parsed / fileMatches.length) * 100));
          setFiles([...fileMatches]);
        }

        fileMatches.sort((a, b) => {
          if (a.status === "matched" && b.status !== "matched") return -1;
          if (a.status !== "matched" && b.status === "matched") return 1;
          return 0;
        });
        setFiles([...fileMatches]);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro ao processar arquivos";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, accountId]
  );

  const handleUpload = async () => {
    const matchedFiles = files.filter((f) => f.status === "matched");
    if (matchedFiles.length === 0) {
      toast.error("Nenhum arquivo vinculado");
      return;
    }

    setUploading(true);
    setProgress(0);

    let uploaded = 0;
    let errors = 0;
    let shouldAbortRemaining = false;

    for (const fm of matchedFiles) {
      if (shouldAbortRemaining) {
        fm.status = "error";
        fm.errorMsg = "Upload interrompido: bucket contract-documents não existe no Supabase";
        errors++;
        setProgress(Math.round(((uploaded + errors) / matchedFiles.length) * 100));
        setFiles([...files]);
        continue;
      }

      try {
        let contractId = fm.contractId;

        if (!contractId && fm.extractedContractNumber) {
          const contractInsert = {
            user_id: user!.id,
            account_id: accountId || undefined,
            contract_number: fm.extractedContractNumber,
            tenant_name: fm.extractedResponsibleName || fm.extractedTenantName || "Inquilino",
            property_id: fm.propertyId || undefined,
            rental_value: 0,
            start_date: fm.extractedStartDate || new Date().toISOString().split("T")[0],
            end_date: fm.extractedEndDate || undefined,
            status: fm.extractedStatus || "active",
          };

          const { data: newContract, error: createErr } = await supabase
            .from("contracts")
            .insert(contractInsert)
            .select("id")
            .single();

          if (createErr) throw createErr;
          contractId = newContract.id;
        }

        if (!contractId) throw new Error("Sem contrato vinculado");

        const objectKey = `${Date.now()}_${crypto.randomUUID()}.pdf`;
        const storagePath = `${user!.id}/${contractId}/${objectKey}`;
        const contentType = fm.file.type?.trim() || "application/pdf";

        let { error: uploadError } = await supabase.storage
          .from("contract-documents")
          .upload(storagePath, fm.file, { contentType, upsert: false });

        // Some client/browser combinations send a problematic content type and
        // Supabase Storage returns 400. Retry once without explicit contentType.
        if (uploadError) {
          const maybeStatus =
            typeof uploadError === "object" &&
            uploadError !== null &&
            "statusCode" in uploadError
              ? (uploadError as { statusCode?: string | number }).statusCode
              : undefined;

          if (String(maybeStatus) === "400") {
            const retry = await supabase.storage
              .from("contract-documents")
              .upload(storagePath, fm.file, { upsert: false });
            uploadError = retry.error;
          }
        }

        if (uploadError) {
          const uploadMessage =
            typeof uploadError === "object" &&
            uploadError !== null &&
            "message" in uploadError &&
            typeof (uploadError as { message?: unknown }).message === "string"
              ? (uploadError as { message: string }).message
              : "";

          console.error("Storage upload error details", {
            message: uploadMessage,
            name:
              typeof uploadError === "object" && uploadError !== null && "name" in uploadError
                ? (uploadError as { name?: unknown }).name
                : undefined,
            statusCode:
              typeof uploadError === "object" && uploadError !== null && "statusCode" in uploadError
                ? (uploadError as { statusCode?: unknown }).statusCode
                : undefined,
            error: uploadError,
            storagePath,
            fileName: fm.file.name,
            fileSize: fm.file.size,
            fileType: fm.file.type,
          });

          if (uploadMessage.toLowerCase().includes("bucket not found")) {
            shouldAbortRemaining = true;
            toast.error("Bucket contract-documents não encontrado no Supabase de produção");
          }

          throw uploadError;
        }

        const { data: contractData, error: loadErr } = await supabase
          .from("contracts")
          .select("documents, property_id")
          .eq("id", contractId)
          .single();

        if (loadErr) throw loadErr;

        const documentsValue = contractData?.documents;
        const existingDocs = Array.isArray(documentsValue) ? documentsValue : [];

        const newDoc = {
          name: fm.file.name,
          path: storagePath,
          type: fm.file.type,
          size: fm.file.size,
          responsible_contact_id: fm.contactId,
          responsible_contact_name: fm.contactName || fm.extractedResponsibleName || fm.tenantName,
          uploaded_at: new Date().toISOString(),
        };

        const updatePayload: Record<string, unknown> = { documents: [...existingDocs, newDoc] };
        if (fm.propertyId && !contractData?.property_id) {
          updatePayload.property_id = fm.propertyId;
        }

        const { error: updateError } = await supabase
          .from("contracts")
          .update(updatePayload)
          .eq("id", contractId);

        if (updateError) throw updateError;

        fm.status = "uploaded";
        uploaded++;
      } catch (err: unknown) {
        fm.status = "error";
        const message =
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Falha no upload";
        fm.errorMsg = message;
        errors++;
      }

      setProgress(Math.round(((uploaded + errors) / matchedFiles.length) * 100));
      setFiles([...files]);
    }

    setUploading(false);
    setStep("done");
    toast.success(`${uploaded} documentos enviados${errors > 0 ? `, ${errors} erros` : ""}`);
    onComplete?.();
  };

  const matchedCount = files.filter((f) => f.status === "matched" || f.status === "uploaded").length;
  const unmatchedCount = files.filter((f) => f.status === "unmatched" || f.status === "error").length;
  const parsingCount = files.filter((f) => f.status === "parsing" || f.status === "pending").length;

  const handleClose = () => {
    setFiles([]);
    setStep("select");
    setProgress(0);
    setParseProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Importar Documentos de Contratos</DialogTitle>
          <DialogDescription>
            Faça upload dos PDFs com nome no padrão <code>contrato_2494_ricardo_luis_mueller.pdf</code>.
            O sistema extrai contrato e responsável pelo nome do arquivo e vincula o PDF ao contrato e ao contato.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <label
              htmlFor="contract-docs-input"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Clique ou arraste os PDFs aqui</p>
              <p className="text-xs text-muted-foreground mt-1">
                Padrão do nome: contrato_2494_ricardo_luis_mueller.pdf
              </p>
              <input
                id="contract-docs-input"
                type="file"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
              />
            </label>
            {loading && <Progress value={30} className="w-full" />}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              {parsingCount > 0 && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Lendo {parsingCount} PDFs...
                </Badge>
              )}
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                {matchedCount} vinculados
              </Badge>
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                {unmatchedCount} sem correspondência
              </Badge>
              <Badge variant="secondary">{files.length} total</Badge>
            </div>

            {parsingCount > 0 && <Progress value={parseProgress} className="w-full" />}

            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-2 space-y-1">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-2 rounded text-sm ${
                      f.status === "matched"
                        ? "bg-green-50 dark:bg-green-950/20"
                        : f.status === "uploaded"
                        ? "bg-blue-50 dark:bg-blue-950/20"
                        : f.status === "parsing" || f.status === "pending"
                        ? "bg-muted/30"
                        : f.status === "error"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : "bg-orange-50 dark:bg-orange-950/20"
                    }`}
                  >
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{f.file.name}</p>

                      {f.status === "parsing" && <p className="text-xs text-muted-foreground">Lendo PDF...</p>}

                      {f.status === "matched" && (
                        <p className="text-xs text-muted-foreground">
                          Contrato #{f.extractedContractNumber} → {f.extractedResponsibleName || f.extractedTenantName || f.tenantName}
                          {f.contactName && ` | 👤 Contato: ${f.contactName}`}
                          {f.extractedUnit && ` | 🏠 ${f.extractedUnit}`}
                          {f.propertyName && ` (${f.propertyName})`}
                          {f.extractedStartDate && ` | 📅 ${f.extractedStartDate}`}
                          {f.extractedEndDate && ` → ${f.extractedEndDate}`}
                          {f.extractedStatus && (
                            <span
                              className={
                                f.extractedStatus === "expired"
                                  ? "ml-1 font-semibold text-destructive"
                                  : "ml-1 font-semibold text-green-600"
                              }
                            >
                              [{f.extractedStatus === "expired" ? "VENCIDO" : "ATIVO"}]
                            </span>
                          )}
                        </p>
                      )}

                      {f.status === "unmatched" && (
                        <p className="text-xs text-destructive">{f.errorMsg || "Não foi possível processar"}</p>
                      )}

                      {f.status === "error" && <p className="text-xs text-destructive">{f.errorMsg}</p>}
                      {f.status === "uploaded" && <p className="text-xs text-blue-600">Enviado com sucesso</p>}
                    </div>

                    {f.status === "matched" && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                    {f.status === "uploaded" && <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                    {f.status === "unmatched" && <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />}
                    {f.status === "error" && <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                    {(f.status === "parsing" || f.status === "pending") && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {uploading && <Progress value={progress} className="w-full" />}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={uploading || matchedCount === 0 || parsingCount > 0}>
                {uploading ? `Enviando... ${progress}%` : `Enviar ${matchedCount} documentos`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h3 className="text-lg font-semibold">Upload concluído!</h3>
            <p className="text-muted-foreground">
              {files.filter((f) => f.status === "uploaded").length} documentos vinculados com sucesso.
              {files.filter((f) => f.status === "error").length > 0 && (
                <> {files.filter((f) => f.status === "error").length} erros.</>
              )}
            </p>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
