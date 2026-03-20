import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  PlusCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedInvoiceItem {
  description: string;
  value: number;
  mappedField: string | null;
  installmentInfo?: string;
}

interface ParsedInvoice {
  invoiceNumber: string;
  clientName: string;
  contractNumber: string;
  competencia: string;
  items: ParsedInvoiceItem[];
  total: number;
  // Mapped values
  rental_amount: number;
  water_amount: number;
  electricity_amount: number;
  gas_amount: number;
  internet_amount: number;
  cleaning_fee: number;
  condo_fee: number;
  discount: number;
  discount_description: string;
  guarantee_installment: number;
  guarantee_installment_number: number | null;
  extra_charges: Array<{ id: string; description: string; value_per_installment: number }>;
  // Status
  found: boolean;
  invoiceId?: string;
  // Contract info (para criar faturas)
  contractFound: boolean;
  contractId?: string;
  propertyId?: string;
  accountId?: string;
  userId?: string;
}

interface ImportInvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mapeamento de descrições para campos
const FIELD_MAPPINGS: Record<string, { field: string; label: string }> = {
  // Aluguel
  "valor da prestação contratual": { field: "rental_amount", label: "Aluguel" },
  "aluguel": { field: "rental_amount", label: "Aluguel" },
  "prestação": { field: "rental_amount", label: "Aluguel" },
  
  // Água
  "água": { field: "water_amount", label: "Água" },
  "agua": { field: "water_amount", label: "Água" },
  
  // Luz
  "luz": { field: "electricity_amount", label: "Luz" },
  "energia": { field: "electricity_amount", label: "Luz" },
  "luz/pra uma pessoa": { field: "electricity_amount", label: "Luz (1 pessoa)" },
  "luz/pra duas pessoas": { field: "electricity_amount", label: "Luz (2+ pessoas)" },
  "luz (1 pessoa)": { field: "electricity_amount", label: "Luz" },
  "luz (2 pessoas)": { field: "electricity_amount", label: "Luz" },
  
  // Gás
  "gás": { field: "gas_amount", label: "Gás" },
  "gas": { field: "gas_amount", label: "Gás" },
  
  // Internet
  "internet": { field: "internet_amount", label: "Internet" },
  
  // Limpeza
  "tx condominio limpeza areas comuns": { field: "cleaning_fee", label: "Limpeza" },
  "tx limpeza da lixeira e corredores": { field: "cleaning_fee", label: "Limpeza" },
  "limpeza": { field: "cleaning_fee", label: "Limpeza" },
  "taxa de limpeza": { field: "cleaning_fee", label: "Limpeza" },
  
  // Condomínio
  "condomínio": { field: "condo_fee", label: "Condomínio" },
  "condominio": { field: "condo_fee", label: "Condomínio" },
  
  // Desconto
  "desconto": { field: "discount", label: "Desconto" },
};

// Detecta se é caução e extrai número da parcela
const parseCaucao = (description: string): { isCaucao: boolean; installmentNumber: number | null } => {
  const lower = description.toLowerCase();
  if (lower.includes("caução") || lower.includes("caucao")) {
    // Extrai número da parcela: "Caução 6x (3/6)" -> 3
    const match = description.match(/\((\d+)\/\d+\)/);
    return {
      isCaucao: true,
      installmentNumber: match ? parseInt(match[1]) : null,
    };
  }
  return { isCaucao: false, installmentNumber: null };
};

// Identifica o campo mapeado para uma descrição
const identifyField = (description: string): { field: string | null; label: string | null; installmentNumber?: number | null } => {
  const lower = description.toLowerCase().trim();
  
  // Verifica caução primeiro
  const caucaoInfo = parseCaucao(description);
  if (caucaoInfo.isCaucao) {
    return { 
      field: "guarantee_installment", 
      label: "Caução",
      installmentNumber: caucaoInfo.installmentNumber
    };
  }
  
  // Busca no mapeamento
  for (const [key, mapping] of Object.entries(FIELD_MAPPINGS)) {
    if (lower.includes(key) || lower === key) {
      return { field: mapping.field, label: mapping.label };
    }
  }
  
  // Não reconhecido - será extra_charge
  return { field: null, label: null };
};

// Parseia texto colado (tab ou vírgula separado)
const parseText = (text: string): string[][] => {
  const lines = text.trim().split("\n");
  return lines.map(line => {
    // Handle tab-separated or comma-separated
    if (line.includes("\t")) {
      return line.split("\t").map(cell => cell.trim());
    }
    // Simple CSV parsing (doesn't handle quoted commas)
    return line.split(",").map(cell => cell.trim().replace(/^"|"$/g, ""));
  });
};

// Converte valor para string (para normalização)
const cellToString = (cell: unknown): string => {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "number") return String(cell);
  return String(cell).trim();
};

// Converte valor string para número
const parseValue = (value: string): number => {
  if (!value) return 0;
  // Remove R$, espaços e converte vírgula para ponto
  const cleaned = value
    .replace(/R\$\s*/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "") // Remove pontos de milhar
    .replace(",", "."); // Vírgula decimal para ponto
  return parseFloat(cleaned) || 0;
};

export function ImportInvoiceDetailsDialog({
  open,
  onOpenChange,
}: ImportInvoiceDetailsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsedData, setParsedData] = useState<ParsedInvoice[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; created: number; updated: number; errors: string[] }>({ success: 0, failed: 0, created: 0, updated: 0, errors: [] });
  const [rawText, setRawText] = useState("");

  const resetState = () => {
    setStep("upload");
    setParsedData([]);
    setImportResults({ success: 0, failed: 0, created: 0, updated: 0, errors: [] });
    setRawText("");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Processa os dados (aceita texto ou array de arrays do XLSX)
  const processData = useCallback(async (data: string | unknown[][]) => {
    let rows: string[][];
    
    if (typeof data === "string") {
      rows = parseText(data);
    } else {
      // Converte array do XLSX para strings
      rows = data.map(row => row.map(cell => cellToString(cell)));
    }
    
    // Pula o cabeçalho
    const dataRows = rows.slice(1).filter(row => row.length > 0 && row[0]);
    
    const parsed: ParsedInvoice[] = [];
    
    for (const row of dataRows) {
      const invoiceNumber = row[0]?.trim();
      const clientName = row[1]?.trim() || "";
      const contractNumber = row[2]?.trim() || "";
      const competencia = row[3]?.trim() || "";
      
      // Inicializa valores
      const invoice: ParsedInvoice = {
        invoiceNumber,
        clientName,
        contractNumber,
        competencia,
        items: [],
        total: 0,
        rental_amount: 0,
        water_amount: 0,
        electricity_amount: 0,
        gas_amount: 0,
        internet_amount: 0,
        cleaning_fee: 0,
        condo_fee: 0,
        discount: 0,
        discount_description: "",
        guarantee_installment: 0,
        guarantee_installment_number: null,
        extra_charges: [],
        found: false,
        contractFound: false,
      };
      
      // Processa itens (pares de descrição/valor começando na coluna 4)
      let colIndex = 4;
      while (colIndex < row.length - 1) { // -1 porque última coluna é Total
        const description = row[colIndex]?.trim();
        const valueStr = row[colIndex + 1]?.trim();
        
        if (description && valueStr) {
          const value = parseValue(valueStr);
          const fieldInfo = identifyField(description);
          
          const item: ParsedInvoiceItem = {
            description,
            value,
            mappedField: fieldInfo.field,
            installmentInfo: fieldInfo.installmentNumber?.toString(),
          };
          invoice.items.push(item);
          
          // Mapeia para o campo correto
          if (fieldInfo.field === "rental_amount") {
            invoice.rental_amount = value;
          } else if (fieldInfo.field === "water_amount") {
            invoice.water_amount = value;
          } else if (fieldInfo.field === "electricity_amount") {
            invoice.electricity_amount = value;
          } else if (fieldInfo.field === "gas_amount") {
            invoice.gas_amount = value;
          } else if (fieldInfo.field === "internet_amount") {
            invoice.internet_amount = value;
          } else if (fieldInfo.field === "cleaning_fee") {
            invoice.cleaning_fee = value;
          } else if (fieldInfo.field === "condo_fee") {
            invoice.condo_fee = value;
          } else if (fieldInfo.field === "discount") {
            invoice.discount = Math.abs(value); // Desconto sempre positivo
            invoice.discount_description = "Importado";
          } else if (fieldInfo.field === "guarantee_installment") {
            invoice.guarantee_installment = value;
            invoice.guarantee_installment_number = fieldInfo.installmentNumber || null;
          } else if (fieldInfo.field === null && value !== 0) {
            // Extra charge
            invoice.extra_charges.push({
              id: `extra-${Date.now()}-${colIndex}`,
              description,
              value_per_installment: value,
            });
          }
        }
        
        colIndex += 2; // Próximo par descrição/valor
      }
      
      // Total da última coluna
      const totalStr = row[row.length - 1]?.trim();
      invoice.total = parseValue(totalStr);
      
      // Busca a fatura no banco
      if (invoiceNumber) {
        const { data } = await supabase
          .from("invoices")
          .select("id, invoice_number")
          .eq("invoice_number", invoiceNumber)
          .maybeSingle();
        
        if (data) {
          invoice.found = true;
          invoice.invoiceId = data.id;
        }
      }
      
      // Se a fatura não foi encontrada, busca o contrato pelo número
      if (!invoice.found && contractNumber) {
        const { data: contractData } = await supabase
          .from("contracts")
          .select("id, property_id, account_id, user_id")
          .eq("contract_number", contractNumber)
          .eq("status", "active")
          .maybeSingle();
        
        if (contractData) {
          invoice.contractFound = true;
          invoice.contractId = contractData.id;
          invoice.propertyId = contractData.property_id;
          invoice.accountId = contractData.account_id;
          invoice.userId = contractData.user_id;
        }
      }
      
      parsed.push(invoice);
    }
    
    setParsedData(parsed);
    setStep("preview");
  }, []);

  // Mutation para importar
  const importMutation = useMutation({
    mutationFn: async () => {
      const results = { success: 0, failed: 0, created: 0, updated: 0, errors: [] as string[] };
      
      for (const invoice of parsedData) {
        // Se não encontrou fatura nem contrato, falha
        if (!invoice.found && !invoice.contractFound) {
          results.failed++;
          results.errors.push(`Fatura ${invoice.invoiceNumber} não encontrada e contrato ${invoice.contractNumber} não existe`);
          continue;
        }
        
        try {
          // Calcula o total
          const calculatedTotal = 
            invoice.rental_amount +
            invoice.water_amount +
            invoice.electricity_amount +
            invoice.gas_amount +
            invoice.internet_amount +
            invoice.cleaning_fee +
            invoice.condo_fee +
            invoice.guarantee_installment +
            invoice.extra_charges.reduce((sum, ec) => sum + ec.value_per_installment, 0) -
            invoice.discount;
          
          if (invoice.found && invoice.invoiceId) {
            // ATUALIZA fatura existente
            const { error } = await supabase
              .from("invoices")
              .update({
                rental_amount: invoice.rental_amount,
                water_amount: invoice.water_amount || null,
                electricity_amount: invoice.electricity_amount || null,
                gas_amount: invoice.gas_amount || null,
                internet_amount: invoice.internet_amount || null,
                cleaning_fee: invoice.cleaning_fee || null,
                condo_fee: invoice.condo_fee || null,
                discount: invoice.discount || null,
                discount_description: invoice.discount > 0 ? invoice.discount_description : null,
                guarantee_installment: invoice.guarantee_installment || null,
                guarantee_installment_number: invoice.guarantee_installment_number,
                extra_charges: invoice.extra_charges.length > 0 ? invoice.extra_charges : null,
                total_amount: calculatedTotal > 0 ? calculatedTotal : invoice.total,
                updated_at: new Date().toISOString(),
              })
              .eq("id", invoice.invoiceId);
            
            if (error) throw error;
            results.success++;
            results.updated++;
          } else if (invoice.contractFound && invoice.contractId && invoice.userId) {
            // CRIA nova fatura
            // Parseia a competência para gerar datas (formato esperado: MM/YYYY ou YYYY-MM)
            let referenceMonth = invoice.competencia;
            let dueDate = new Date();
            let issueDate = new Date();
            
            // Tenta parsear competência
            const competenciaParts = invoice.competencia.match(/(\d{2})\/(\d{4})/);
            if (competenciaParts) {
              const [, month, year] = competenciaParts;
              referenceMonth = `${year}-${month}`;
              // Vencimento padrão: dia 10 do mês de competência
              dueDate = new Date(parseInt(year), parseInt(month) - 1, 10);
              // Data emissão: 5 dias antes do vencimento
              issueDate = new Date(dueDate);
              issueDate.setDate(issueDate.getDate() - 5);
            }
            
            const { error } = await supabase
              .from("invoices")
              .insert({
                invoice_number: invoice.invoiceNumber,
                contract_id: invoice.contractId,
                property_id: invoice.propertyId,
                account_id: invoice.accountId,
                user_id: invoice.userId,
                reference_month: referenceMonth,
                issue_date: issueDate.toISOString().split("T")[0],
                due_date: dueDate.toISOString().split("T")[0],
                status: "pending",
                rental_amount: invoice.rental_amount,
                water_amount: invoice.water_amount || null,
                electricity_amount: invoice.electricity_amount || null,
                gas_amount: invoice.gas_amount || null,
                internet_amount: invoice.internet_amount || null,
                cleaning_fee: invoice.cleaning_fee || null,
                condo_fee: invoice.condo_fee || null,
                discount: invoice.discount || null,
                discount_description: invoice.discount > 0 ? invoice.discount_description : null,
                guarantee_installment: invoice.guarantee_installment || null,
                guarantee_installment_number: invoice.guarantee_installment_number,
                extra_charges: invoice.extra_charges.length > 0 ? invoice.extra_charges : null,
                total_amount: calculatedTotal > 0 ? calculatedTotal : invoice.total,
              });
            
            if (error) throw error;
            results.success++;
            results.created++;
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`Fatura ${invoice.invoiceNumber}: ${err instanceof Error ? err.message : "Erro"}`);
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      setImportResults(results);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error) => {
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        
        // Pega a primeira aba
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converte para array de arrays
        const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
        
        processData(jsonData);
      } catch (err) {
        toast({
          title: "Erro ao ler arquivo",
          description: "Não foi possível ler o arquivo Excel. Verifique se é um arquivo .xlsx válido.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePaste = () => {
    if (rawText.trim()) {
      processData(rawText);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getFieldLabel = (field: string | null): string => {
    if (!field) return "Extra";
    const labels: Record<string, string> = {
      rental_amount: "Aluguel",
      water_amount: "Água",
      electricity_amount: "Luz",
      gas_amount: "Gás",
      internet_amount: "Internet",
      cleaning_fee: "Limpeza",
      condo_fee: "Condomínio",
      discount: "Desconto",
      guarantee_installment: "Caução",
    };
    return labels[field] || field;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Detalhes das Faturas
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Faça upload de um arquivo Excel (.xlsx) ou cole dados da planilha"}
            {step === "preview" && "Revise os dados antes de confirmar a importação"}
            {step === "importing" && "Importando dados..."}
            {step === "done" && "Importação concluída"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cole os dados da planilha (com cabeçalho)</Label>
                <textarea
                  className="w-full h-40 p-3 border rounded-md font-mono text-sm resize-none"
                  placeholder="Nº Fatura	Nome do Cliente	Contrato	Competência	Item 1 - Descrição	Item 1 - Valor (R$)..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
                <Button onClick={handlePaste} disabled={!rawText.trim()}>
                  Processar Dados
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Ou faça upload de um arquivo Excel (.xlsx)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="max-w-xs"
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Formato esperado:</strong> Nº Fatura, Nome do Cliente, Contrato, Competência, 
                  seguido de pares Item Descrição/Valor (até 8 itens), e Total.
                  <br />
                  <strong>Itens reconhecidos:</strong> Valor da prestação contratual, Água, Luz, Gás, 
                  Internet, Tx Limpeza, Caução, Desconto. Outros itens serão importados como cobranças extras.
                  <br />
                  <strong>Comportamento:</strong> Faturas existentes serão atualizadas. Faturas não encontradas 
                  serão criadas se o contrato existir no sistema.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="font-medium">{parsedData.length} faturas na planilha</span>
                  <Badge variant="default">
                    {parsedData.filter(p => p.found).length} para atualizar
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {parsedData.filter(p => !p.found && p.contractFound).length} para criar
                  </Badge>
                  <Badge variant="destructive">
                    {parsedData.filter(p => !p.found && !p.contractFound).length} sem contrato
                  </Badge>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[100px]">Nº Fatura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Itens Identificados</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((invoice, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {invoice.found ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : invoice.contractFound ? (
                            <PlusCircle className="h-5 w-5 text-blue-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{invoice.clientName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {invoice.items.map((item, i) => (
                              <Badge 
                                key={i} 
                                variant={item.mappedField ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {getFieldLabel(item.mappedField)}: {formatCurrency(Math.abs(item.value))}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Importando faturas...</p>
              <p className="text-sm text-muted-foreground">Atualizando existentes e criando novas</p>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-6 py-8">
                {importResults.updated > 0 && (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-500">{importResults.updated}</div>
                    <div className="text-sm text-muted-foreground">Atualizadas</div>
                  </div>
                )}
                {importResults.created > 0 && (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-500">{importResults.created}</div>
                    <div className="text-sm text-muted-foreground">Criadas</div>
                  </div>
                )}
                {importResults.failed > 0 && (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-red-500">{importResults.failed}</div>
                    <div className="text-sm text-muted-foreground">Falhas</div>
                  </div>
                )}
              </div>

              {importResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erros:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {importResults.errors.slice(0, 5).map((err, i) => (
                        <li key={i} className="text-sm">{err}</li>
                      ))}
                      {importResults.errors.length > 5 && (
                        <li className="text-sm">... e mais {importResults.errors.length - 5} erros</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button 
                onClick={() => {
                  setStep("importing");
                  importMutation.mutate();
                }}
                disabled={parsedData.filter(p => p.found || p.contractFound).length === 0}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar {parsedData.filter(p => p.found || p.contractFound).length} Faturas
              </Button>
            </>
          )}
          
          {step === "done" && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
