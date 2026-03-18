import { useCallback, useMemo, useState } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Users,
  FileText,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ImportStep = "upload" | "preview" | "importing" | "done";

interface ContactRow {
  name: string;
  document: string;
  phone: string;
  email: string;
  fullAddress: string;
  blockApt: string;
  birthDate: string;
  contractNumber: string;
  contractActive: string;
  status?: "pending" | "success" | "error" | "duplicate";
  message?: string;
  propertyName?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
}

interface ContractRow {
  tenantName: string;
  contractNumber: string;
  contractStatus: string;
  vigencia: string;
  startDate: string;
  endDate: string;
  invoiceCount: number;
  avgAmount: number;
  status?: "pending" | "success" | "error" | "duplicate";
  message?: string;
  generatedId?: string;
}

interface InvoiceRow {
  tenantName: string;
  invoiceNumber: string;
  contractNumber: string;
  referenceMonth: string;
  dueDate: string;
  amount: number;
  situation: string;
  paymentStatus: string;
  status?: "pending" | "success" | "error";
  message?: string;
}

function normalizeHeader(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseDateBR(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const match = clean.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (!match) return null;

  let day = Number(match[1]);
  let month = Number(match[2]);
  let year = Number(match[3]);

  if (year < 100) year += 2000;

  if (month > 12 && day <= 12) {
    const temp = day;
    day = month;
    month = temp;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseRefMonth(refStr: string): string | null {
  if (!refStr) return null;
  const clean = String(refStr).trim().toLowerCase();

  const normalized = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.split("/");
  if (parts.length !== 2) return null;

  const monthMap: Record<string, number> = {
    jan: 1,
    fev: 2,
    mar: 3,
    abr: 4,
    mai: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    set: 9,
    out: 10,
    nov: 11,
    dez: 12,
  };

  const monthPart = parts[0];
  const yearPart = parts[1];

  let month = Number(monthPart);
  if (!Number.isFinite(month) || month <= 0) {
    month = monthMap[monthPart] || 0;
  }

  let year = Number(yearPart);
  if (year < 100) year += 2000;

  if (!month || month < 1 || month > 12 || !year) return null;

  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function parseDateAny(value: unknown): string {
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d?.y && d?.m && d?.d) {
      return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}`;
    }
  }
  return String(value || "").trim();
}

function parseBRLValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;

  let str = String(value)
    .replace(/R\$/gi, "")
    .replace(/\u00A0/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!str) return 0;

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    str = str.replace(",", ".");
  }

  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePaymentStatus(value: string): "Pago" | "Não pago" | "" {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) return "";
  if (normalized.includes("nao pago") || normalized.includes("não pago") || normalized.includes("pendente")) return "Não pago";
  if (normalized.includes("pago")) return "Pago";
  return "";
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

function isMissingAccountColumnError(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("column") &&
    normalized.includes("account_id") &&
    (
      normalized.includes("does not exist") ||
      normalized.includes("not found") ||
      normalized.includes("could not find")
    )
  );
}

function parseVigencia(vigencia: string): { startDate: string; endDate: string } {
  const clean = String(vigencia || "").trim();
  if (!clean || clean === "-") {
    return { startDate: "", endDate: "" };
  }

  const parts = clean.split(/\s+a\s+/i);
  return {
    startDate: parts[0]?.trim() || "",
    endDate: parts[1]?.trim() || "",
  };
}

function valueByAliases(row: Record<string, unknown>, aliases: string[]): string {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const key of Object.keys(row)) {
    if (normalizedAliases.includes(normalizeHeader(key))) {
      return String(row[key] ?? "").trim();
    }
  }
  return "";
}

const ImportConciliacao = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accountId, loading: accountLoading } = useAccountId();

  const [step, setStep] = useState<ImportStep>("upload");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("");
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [workbookFile, setWorkbookFile] = useState<string | null>(null);

  const canPreview = contacts.length > 0 || contracts.length > 0 || invoices.length > 0;

  const stats = useMemo(() => {
    const countByStatus = (items: { status?: string }[]) => ({
      success: items.filter((i) => i.status === "success").length,
      error: items.filter((i) => i.status === "error").length,
      duplicate: items.filter((i) => i.status === "duplicate").length,
    });

    return {
      contacts: countByStatus(contacts),
      contracts: countByStatus(contracts),
      invoices: countByStatus(invoices),
    };
  }, [contacts, contracts, invoices]);

  const resolveAccountId = useCallback(async () => {
    if (!user) return null;
    if (accountId) return accountId;

    // 1) Try profile.account_id
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.account_id) return profile.account_id;
    } catch {
      // ignore and try next fallback
    }

    // 2) Try account owned by user
    try {
      const { data: owned } = await supabase
        .from("accounts")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (owned?.id) {
        try {
          await supabase.from("profiles").upsert({ 
            id: user.id, 
            account_id: owned.id 
          }, { onConflict: 'id' });
        } catch {
          // profile sync is best effort
        }
        return owned.id;
      }
    } catch {
      // ignore and try creating account
    }

    // 3) Create a default account for the user
    try {
      const defaultName = user.email ? `Conta ${user.email.split("@")[0]}` : "Conta Principal";
      const { data: created, error } = await supabase
        .from("accounts")
        .insert({
          owner_id: user.id,
          account_name: defaultName,
          subscription_status: "trial",
        })
        .select("id")
        .single();

      if (error) throw error;

      try {
        await supabase.from("profiles").upsert({ 
          id: user.id, 
          account_id: created.id 
        }, { onConflict: 'id' });
      } catch {
        // profile sync is best effort
      }

      return created.id;
    } catch {
      return null;
    }
  }, [user, accountId]);

  const handleWorkbookFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWorkbookFile(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: "array", cellDates: false, raw: true });

        const sheetInfo = workbook.SheetNames.map((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
          const headers = rows.length ? Object.keys(rows[0]).map(normalizeHeader) : [];
          return { sheetName, rows, headers };
        });

        const contactsSheet = sheetInfo.find((s) =>
          s.headers.includes("nome") && (s.headers.some((h) => h.includes("cpf cnpj")) || s.headers.some((h) => h.includes("cpf")))
        );

        const contractsSheet = sheetInfo.find((s) =>
          (s.headers.includes("inquilino") || s.headers.includes("nome")) && s.headers.some((h) => h.includes("contrato"))
        );

        const invoicesSheet = sheetInfo.find((s) =>
          s.headers.some((h) => h.includes("fatura")) && s.headers.some((h) => h.includes("competencia"))
        );

        if (!contactsSheet && !contractsSheet && !invoicesSheet) {
          toast.error("Não foi possível identificar as abas de Contatos, Contratos e Faturas.");
          return;
        }

        const parsedContacts: ContactRow[] = (contactsSheet?.rows || [])
          .map((row) => ({
            name: valueByAliases(row, ["Nome"]),
            document: valueByAliases(row, ["CPF/CNPJ", "CPF", "CNPJ"]),
            phone: valueByAliases(row, ["Telefone", "Celular"]),
            email: valueByAliases(row, ["Email", "E-mail"]),
            fullAddress: valueByAliases(row, ["Endereço Completo", "Endereco Completo", "Endereço", "Endereco"]),
            blockApt: valueByAliases(row, ["Bloco/AP", "Bloco", "Apartamento"]),
            birthDate: parseDateAny(valueByAliases(row, ["Data de Nascimento", "Nascimento"])),
            contractNumber: valueByAliases(row, ["Contrato", "Nº do Contrato", "No do Contrato", "Numero do Contrato"]),
            contractActive: valueByAliases(row, ["Contrato Ativo", "Ativo"]),
            propertyName: valueByAliases(row, ["Nome do imovel", "Imóvel", "Imovel"]),
            address: valueByAliases(row, ["Endereço", "Endereco"]),
            number: valueByAliases(row, ["Numero", "Número"]),
            complement: valueByAliases(row, ["Complemento"]),
            neighborhood: valueByAliases(row, ["Bairro"]),
            city: valueByAliases(row, ["Cidade"]),
            state: valueByAliases(row, ["UF", "Estado"]),
            postalCode: valueByAliases(row, ["CEP"]),
            ownerName: valueByAliases(row, ["Nome proprietário", "Nome do proprietario", "Proprietário", "Proprietario"]),
            ownerPhone: valueByAliases(row, ["Telefone_1", "Telefone do Proprietário", "Telefone proprietario"]),
            ownerEmail: valueByAliases(row, ["Email_1", "E-mail_1", "Email do Proprietário", "Email proprietario"]),
            status: "pending" as const,
          }))
          .filter((c) => c.name);

        const rawContractRows = contractsSheet?.rows || contactsSheet?.rows || [];
        const uniqueContractMap = new Map<string, any>();
        
        rawContractRows.forEach(row => {
            const contractNumber = valueByAliases(row, ["Nº do Contrato", "No do Contrato", "Numero do Contrato", "Contrato"]);
            if (contractNumber) {
                // Keep only one row per contract number to avoid duplicates
                if (!uniqueContractMap.has(contractNumber)) {
                    uniqueContractMap.set(contractNumber, row);
                }
            } else {
                // If it doesn't have a contract number, we keep it based on a dummy key or skip depending on rules.
                // We'll skip it because contracts need an identifier/tenant
            }
        });
        const contractRowsToProcess = Array.from(uniqueContractMap.values());

        const parsedContracts: ContractRow[] = contractRowsToProcess
          .map((row) => {
            const vigencia = valueByAliases(row, ["Vigência", "Vigencia"]);
            const dates = parseVigencia(vigencia);

            return {
              tenantName: valueByAliases(row, ["Inquilino", "Nome do Cliente", "Cliente", "Nome"]),
              contractNumber: valueByAliases(row, ["Nº do Contrato", "No do Contrato", "Numero do Contrato", "Contrato"]),
              contractStatus: valueByAliases(row, ["Status", "Situação", "Situacao", "Contrato Ativo"]),
              vigencia,
              startDate: dates.startDate,
              endDate: dates.endDate,
              invoiceCount: 0,
              avgAmount: 0,
              status: "pending" as const,
            };
          })
          .filter((c) => c.contractNumber || c.tenantName);

        const parsedInvoices: InvoiceRow[] = (invoicesSheet?.rows || [])
          .map((row) => {
            const situation = valueByAliases(row, ["Situação", "Situacao", "Status Pagamento"]);
            const genericStatus = valueByAliases(row, ["Status"]);
            const statusAsContract = /^#?\d+[\w-]*$/i.test(genericStatus.replace(/\s/g, "")) ? genericStatus : "";

            return {
              tenantName: valueByAliases(row, ["Nome do Cliente", "Cliente", "Inquilino"]),
              invoiceNumber: valueByAliases(row, ["ID da Fatura", "Fatura", "Numero da Fatura"]),
              contractNumber:
                valueByAliases(row, ["Nº do Contrato", "No do Contrato", "Numero do Contrato", "Contrato"]) ||
                statusAsContract,
              referenceMonth: valueByAliases(row, ["Competência", "Competencia", "Referência", "Referencia"]),
              dueDate: parseDateAny(valueByAliases(row, ["Data de Vencimento", "Vencimento"])),
              amount: parseBRLValue(valueByAliases(row, ["Valor", "Valor Total", "Total"])),
              situation,
              paymentStatus: normalizePaymentStatus(situation) || normalizePaymentStatus(genericStatus),
              status: "pending" as const,
            };
          })
          .filter((i) => i.invoiceNumber || i.tenantName);

        const invoiceAgg = new Map<string, { count: number; total: number }>();
        parsedInvoices.forEach((inv) => {
          const contractNumber = inv.contractNumber.trim();
          if (!contractNumber) return;

          const current = invoiceAgg.get(contractNumber);
          if (current) {
            current.count += 1;
            current.total += inv.amount;
          } else {
            invoiceAgg.set(contractNumber, { count: 1, total: inv.amount });
          }
        });

        const enrichedContracts = parsedContracts.map((contract) => {
          const agg = invoiceAgg.get(contract.contractNumber.trim());
          if (!agg) return contract;
          return {
            ...contract,
            invoiceCount: agg.count,
            avgAmount: agg.count > 0 ? agg.total / agg.count : 0,
          };
        });

        setContacts(parsedContacts);
        setContracts(enrichedContracts);
        setInvoices(parsedInvoices);

        toast.success(`${parsedContacts.length} contatos, ${enrichedContracts.length} contratos e ${parsedInvoices.length} faturas carregados`);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao processar o arquivo XLSX");
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const clearExistingData = async (activeAccountId: string) => {
    setCurrentPhase("Limpando dados existentes...");

    const safeDeleteByAccountOrUser = async (
      table: "lancamentos_financeiros" | "invoices" | "contracts" | "contacts"
    ) => {
      const { error } = await supabase.from(table).delete().eq("account_id", activeAccountId);

      if (!error) return;

      if (isMissingAccountColumnError(error.message) && user?.id) {
        const { error: fallbackError } = await supabase.from(table).delete().eq("user_id", user.id);
        if (fallbackError) throw fallbackError;
        return;
      }

      throw error;
    };

    await safeDeleteByAccountOrUser("lancamentos_financeiros");
    await safeDeleteByAccountOrUser("invoices");
    await safeDeleteByAccountOrUser("contracts");
    await safeDeleteByAccountOrUser("contacts");

    toast.info("Dados anteriores removidos");
  };

  const startImport = async () => {
    if (!user) {
      toast.error("Usuário ou conta não encontrados");
      return;
    }

    const activeAccountId = await resolveAccountId();
    if (!activeAccountId) {
      toast.error("Conta não encontrada. Crie sua conta em Configurações e tente novamente.");
      return;
    }

    setStep("importing");

    const totalSteps = contacts.length + contracts.length + invoices.length + (clearBeforeImport ? 1 : 0);
    let completed = 0;

    if (clearBeforeImport) {
      await clearExistingData(activeAccountId);
      completed += 1;
      setProgress(Math.round((completed / totalSteps) * 100));
    }

    if (contacts.length > 0) {
      setCurrentPhase("Importando contatos...");
      const updated = [...contacts];

      for (let i = 0; i < updated.length; i++) {
        const row = updated[i];

        try {
          const doc = row.document.trim();
          if (doc) {
            const { data: exists } = await supabase
              .from("contacts")
              .select("id")
              .eq("account_id", activeAccountId)
              .eq("document", doc)
              .maybeSingle();

            if (exists) {
              updated[i] = { ...row, status: "duplicate", message: "Documento já existe" };
              completed += 1;
              setContacts([...updated]);
              setProgress(Math.round((completed / totalSteps) * 100));
              continue;
            }
          }

          const notes = [
            row.birthDate ? `Nascimento: ${row.birthDate}` : "",
            row.contractNumber ? `Contrato informado: ${row.contractNumber}` : "",
            row.contractActive ? `Contrato ativo: ${row.contractActive}` : "",
          ]
            .filter(Boolean)
            .join(" | ");

          const payload = {
            user_id: user.id,
            account_id: activeAccountId,
            name: row.name,
            contact_type: "inquilino",
            document: doc || null,
            phone: row.phone || null,
            email: row.email || null,
            address: [row.fullAddress, row.blockApt ? `Bloco/AP: ${row.blockApt}` : ""].filter(Boolean).join(" | ") || null,
            status: "active",
            notes: notes || null,
          };

          const { error } = await supabase.from("contacts").insert(payload);
          if (error) throw error;

          if (row.propertyName) {
            try {
              let propId: string | null = null;
              const { data: propExists } = await supabase
                .from("properties")
                .select("id")
                .eq("account_id", activeAccountId)
                .eq("name", row.propertyName.trim())
                .maybeSingle();

              if (!propExists) {
                const { data: newProp, error: propError } = await supabase.from("properties").insert({
                  user_id: user.id,
                  account_id: activeAccountId,
                  name: row.propertyName.trim(),
                  property_type: "residencial",
                  status: (row.contractActive?.toLowerCase() === 'sim') ? 'rented' : 'available',
                  address: row.address || row.fullAddress || "Não informado",
                  number: row.number || null,
                  complement: row.complement || null,
                  neighborhood: row.neighborhood || null,
                  city: row.city || "Não informada",
                  state: row.state || "PR",
                  postal_code: row.postalCode || null,
                  owner_name: row.ownerName || null,
                  owner_contact: row.ownerPhone || null,
                  owner_email: row.ownerEmail || null
                }).select("id").single();

                if (propError) throw propError;
                propId = newProp.id;
              } else {
                propId = propExists.id;
              }

              if (propId && row.contractNumber) {
                propertyIdMap.set(row.contractNumber.trim(), propId);
              }
            } catch (propErr: any) {
               console.error("Erro ao inserir imóvel:", propErr);
               throw new Error(`Erro imóvel: ${propErr.message || "Falha desconhecida"}`);
            }
          }

          updated[i] = { ...row, status: "success" };
        } catch (err: any) {
          const message = String(err?.message || "Erro ao inserir contato");
          updated[i] = { ...row, status: "error", message };

          if (isRlsOrPermissionError(message)) {
            for (let j = i + 1; j < updated.length; j++) {
              updated[j] = {
                ...updated[j],
                status: "error",
                message: "Importação interrompida por falta de permissão em contacts (RLS).",
              };
            }

            setContacts([...updated]);
            setProgress(Math.round((completed / totalSteps) * 100));
            toast.error("Sem permissão para inserir contatos no banco (RLS). Aplique a migration de hardfix de contacts.");
            break;
          }
        }

        completed += 1;
        setContacts([...updated]);
        setProgress(Math.round((completed / totalSteps) * 100));
      }
    }

    const contractIdMap = new Map<string, string>();
    const propertyIdMap = new Map<string, string>();
    const contactsByContract = new Map<string, ContactRow[]>();

    for (const contact of contacts) {
      const contractNumber = contact.contractNumber?.trim();
      if (!contractNumber) continue;

      const existingContacts = contactsByContract.get(contractNumber) || [];
      existingContacts.push(contact);
      contactsByContract.set(contractNumber, existingContacts);
    }

    if (contracts.length > 0) {
      setCurrentPhase("Importando contratos...");
      const updated = [...contracts];

      for (let i = 0; i < updated.length; i++) {
        const row = updated[i];
        try {
          const { data: existing } = await supabase
            .from("contracts")
            .select("id")
            .eq("account_id", activeAccountId)
            .eq("contract_number", row.contractNumber)
            .maybeSingle();

          if (existing) {
            contractIdMap.set(row.contractNumber, existing.id);
            updated[i] = { ...row, generatedId: existing.id, status: "duplicate", message: "Já existe" };
            completed += 1;
            setContracts([...updated]);
            setProgress(Math.round((completed / totalSteps) * 100));
            continue;
          }

          const normalizedStatus = row.contractStatus
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          const status = normalizedStatus.includes("ativo") ? "active" : "inactive";
          const startDate = parseDateBR(row.startDate) || new Date().toISOString().split("T")[0];
          const rentalValue = row.avgAmount > 0 ? row.avgAmount : 0;
          const residents = contactsByContract.get(row.contractNumber.trim()) || [];
          const residentByName = new Map<string, ContactRow>();

          for (const resident of residents) {
            const key = resident.name.trim().toLowerCase();
            if (!key || residentByName.has(key)) continue;
            residentByName.set(key, resident);
          }

          const uniqueResidents = Array.from(residentByName.values());
          const fallbackTenant = uniqueResidents[0]?.name || "";
          const tenantName = row.tenantName || fallbackTenant || `Contrato ${row.contractNumber}`;

          const coTenants = uniqueResidents
            .filter((resident) => resident.name.trim().toLowerCase() !== tenantName.trim().toLowerCase())
            .map((resident) => ({
              name: resident.name,
              document: resident.document || null,
              email: resident.email || null,
              phone: resident.phone || null,
              relationship: "morador",
            }));

          const { data, error } = await supabase
            .from("contracts")
            .insert({
              user_id: user.id,
              account_id: activeAccountId,
              property_id: propertyIdMap.get(row.contractNumber.trim()) || null,
              contract_number: row.contractNumber,
              tenant_name: tenantName,
              co_tenants: coTenants.length > 0 ? coTenants : null,
              rental_value: rentalValue,
              start_date: startDate,
              status,
              payment_day: parseInt(startDate.split("-")[2], 10) || 5,
            })
            .select("id")
            .single();

          if (error) throw error;
          contractIdMap.set(row.contractNumber, data.id);
          updated[i] = { ...row, generatedId: data.id, status: "success" };
        } catch (err: any) {
          const message = String(err?.message || "Erro ao inserir contrato");
          updated[i] = { ...row, status: "error", message };

          if (isRlsOrPermissionError(message)) {
            for (let j = i + 1; j < updated.length; j++) {
              updated[j] = {
                ...updated[j],
                status: "error",
                message: "Importação interrompida por falta de permissão em contracts (RLS).",
              };
            }

            setContracts([...updated]);
            setProgress(Math.round((completed / totalSteps) * 100));
            toast.error("Sem permissão para inserir contratos no banco (RLS). Aplique a migration de hardfix de contracts.");
            break;
          }
        }

        completed += 1;
        setContracts([...updated]);
        setProgress(Math.round((completed / totalSteps) * 100));
      }
    }

    if (invoices.length > 0) {
      setCurrentPhase("Importando faturas...");
      const updated = [...invoices];

      for (let i = 0; i < updated.length; i++) {
        const row = updated[i];

        try {
          const dueDate = parseDateBR(row.dueDate) || new Date().toISOString().split("T")[0];
          const refMonth = parseRefMonth(row.referenceMonth) || dueDate;

          const isPaid = row.paymentStatus === "Pago";
          const normalizedSituation = row.situation
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          const isCancelled = normalizedSituation.includes("cancel") || normalizedSituation.includes("baixad");
          const isPastDue = new Date(dueDate) < new Date();
          const status = isCancelled ? "cancelled" : isPaid ? "paid" : isPastDue ? "overdue" : "pending";

          const { error } = await supabase.from("invoices").insert({
            user_id: user.id,
            account_id: activeAccountId,
            invoice_number: row.invoiceNumber,
            contract_id: contractIdMap.get(row.contractNumber) || null,
            total_amount: row.amount,
            rental_amount: row.amount,
            due_date: dueDate,
            reference_month: refMonth,
            issue_date: dueDate,
            status,
            payment_date: isPaid ? dueDate : null,
          });

          if (error) throw error;
          updated[i] = { ...row, status: "success" };
        } catch (err: any) {
          const message = String(err?.message || "Erro ao inserir fatura");
          updated[i] = { ...row, status: "error", message };

          if (isRlsOrPermissionError(message)) {
            for (let j = i + 1; j < updated.length; j++) {
              updated[j] = {
                ...updated[j],
                status: "error",
                message: "Importação interrompida por falta de permissão em invoices (RLS).",
              };
            }

            setInvoices([...updated]);
            setProgress(Math.round((completed / totalSteps) * 100));
            toast.error("Sem permissão para inserir faturas no banco (RLS). Aplique a migration de hardfix de invoices.");
            break;
          }
        }

        completed += 1;
        setInvoices([...updated]);
        setProgress(Math.round((completed / totalSteps) * 100));
      }
    }

    setStep("done");
    setCurrentPhase("Importação concluída!");
    toast.success("Importação finalizada.");
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "duplicate":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  return (
    <AppLayout title="Importação de Conciliação">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Importação XLSX Unificada</h1>
            <p className="text-muted-foreground text-sm">
              Envie uma planilha XLSX com 3 abas: Contatos, Contratos e Faturas.
            </p>
          </div>
        </div>

        {step === "upload" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="h-5 w-5" /> Arquivo XLSX
                </CardTitle>
                <CardDescription>
                  Colunas esperadas: Contatos (Nome, CPF/CNPJ...), Contratos (Inquilino, Nº do Contrato...), Faturas (ID da Fatura, Competência...).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  {workbookFile ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm font-medium">{workbookFile}</p>
                      <p className="text-xs text-muted-foreground">
                        {contacts.length} contatos / {contracts.length} contratos / {invoices.length} faturas
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Selecionar XLSX</p>
                    </>
                  )}
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleWorkbookFile} />
                </label>
              </CardContent>
            </Card>

            {canPreview && (
              <Card className="border-destructive/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-5 w-5 text-destructive" />
                      <div>
                        <Label htmlFor="clear-toggle" className="font-medium">
                          Limpar dados existentes antes de importar
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Remove contatos, contratos, faturas e lançamentos financeiros atuais.
                        </p>
                      </div>
                    </div>
                    <Switch id="clear-toggle" checked={clearBeforeImport} onCheckedChange={setClearBeforeImport} />
                  </div>
                </CardContent>
              </Card>
            )}

            <Button className="w-full" size="lg" disabled={!canPreview} onClick={() => setStep("preview")}>
              Pré-visualizar ({contacts.length} contatos, {contracts.length} contratos, {invoices.length} faturas)
            </Button>
          </div>
        )}

        {step === "preview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{contacts.length}</p>
                      <p className="text-sm text-muted-foreground">Contatos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{contracts.length}</p>
                      <p className="text-sm text-muted-foreground">Contratos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{invoices.length}</p>
                      <p className="text-sm text-muted-foreground">Faturas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {clearBeforeImport && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Todos os dados atuais de contatos, contratos, faturas e lançamentos serão removidos antes da importação.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="contatos">
              <TabsList>
                <TabsTrigger value="contatos">Contatos ({contacts.length})</TabsTrigger>
                <TabsTrigger value="contratos">Contratos ({contracts.length})</TabsTrigger>
                <TabsTrigger value="faturas">Faturas ({invoices.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="contatos">
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>CPF/CNPJ</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Email</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contacts.slice(0, 30).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{getStatusIcon(row.status)}</TableCell>
                              <TableCell className="font-medium">{row.name}</TableCell>
                              <TableCell className="text-xs">{row.document}</TableCell>
                              <TableCell className="text-xs">{row.phone}</TableCell>
                              <TableCell className="text-xs">{row.email}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contratos">
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Nº Contrato</TableHead>
                            <TableHead>Inquilino</TableHead>
                            <TableHead>Status Contrato</TableHead>
                            <TableHead>Vigência</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contracts.slice(0, 30).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{getStatusIcon(row.status)}</TableCell>
                              <TableCell className="font-medium">{row.contractNumber}</TableCell>
                              <TableCell className="text-xs">{row.tenantName}</TableCell>
                              <TableCell className="text-xs">{row.contractStatus}</TableCell>
                              <TableCell className="text-xs">{row.vigencia}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faturas">
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Fatura</TableHead>
                            <TableHead>Contrato</TableHead>
                            <TableHead>Competência</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.slice(0, 30).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{getStatusIcon(row.status)}</TableCell>
                              <TableCell className="font-medium text-xs">{row.invoiceNumber}</TableCell>
                              <TableCell className="text-xs">{row.contractNumber}</TableCell>
                              <TableCell className="text-xs">{row.referenceMonth}</TableCell>
                              <TableCell className="text-xs">{row.dueDate}</TableCell>
                              <TableCell className="text-xs">
                                R$ {row.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-xs">{row.situation || row.paymentStatus || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button className="flex-1" size="lg" onClick={startImport} disabled={accountLoading}>
                {clearBeforeImport ? "Limpar e Importar Tudo" : "Iniciar Importação"}
              </Button>
            </div>
          </>
        )}

        {(step === "importing" || step === "done") && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{currentPhase}</p>
                  <Badge variant={step === "done" ? "default" : "secondary"}>{progress}%</Badge>
                </div>
                <Progress value={progress} className="h-3" />
              </CardContent>
            </Card>

            {step === "done" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" /> Contatos
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600"> {stats.contacts.success} importados</p>
                        {stats.contacts.duplicate > 0 && <p className="text-yellow-600"> {stats.contacts.duplicate} duplicados</p>}
                        {stats.contacts.error > 0 && <p className="text-destructive"> {stats.contacts.error} erros</p>}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Contratos
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600"> {stats.contracts.success} importados</p>
                        {stats.contracts.duplicate > 0 && <p className="text-yellow-600"> {stats.contracts.duplicate} duplicados</p>}
                        {stats.contracts.error > 0 && <p className="text-destructive"> {stats.contracts.error} erros</p>}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <Receipt className="h-4 w-4" /> Faturas
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600"> {stats.invoices.success} importadas</p>
                        {stats.invoices.error > 0 && <p className="text-destructive"> {stats.invoices.error} erros</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate("/configuracoes")}>Voltar às Configurações</Button>
                  <Button onClick={() => navigate("/contatos")}>Ver Contatos</Button>
                  <Button onClick={() => navigate("/contratos")}>Ver Contratos</Button>
                  <Button onClick={() => navigate("/faturas")}>Ver Faturas</Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ImportConciliacao;
