import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Webhook,
  Save,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Send,
  FileText,
  Link2,
  User,
  Building2,
  Receipt,
  Calendar,
  Hash,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  Shield,
  Info,
  Trash2,
  Plus,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface WebhookFormData {
  name: string;
  webhook_url: string;
  is_active: boolean;
  include_tenant_name: boolean;
  include_tenant_document: boolean;
  include_tenant_email: boolean;
  include_tenant_phone: boolean;
  include_property_address: boolean;
  include_contract_number: boolean;
  include_contract_dates: boolean;
  include_contract_value: boolean;
  include_invoice_number: boolean;
  include_invoice_amount: boolean;
  include_invoice_due_date: boolean;
  include_invoice_status: boolean;
  include_invoice_breakdown: boolean;
  include_reference_month: boolean;
  invoice_delivery_mode: string;
  custom_message: string;
  http_method: string;
  auth_type: string;
  auth_token: string;
}

const defaultFormData: WebhookFormData = {
  name: "Webhook Principal",
  webhook_url: "",
  is_active: true,
  include_tenant_name: true,
  include_tenant_document: false,
  include_tenant_email: true,
  include_tenant_phone: true,
  include_property_address: true,
  include_contract_number: true,
  include_contract_dates: false,
  include_contract_value: false,
  include_invoice_number: true,
  include_invoice_amount: true,
  include_invoice_due_date: true,
  include_invoice_status: true,
  include_invoice_breakdown: false,
  include_reference_month: true,
  invoice_delivery_mode: "public_link",
  custom_message: "",
  http_method: "POST",
  auth_type: "none",
  auth_token: "",
};

const FIELD_GROUPS = [
  {
    title: "Dados do Locatário",
    icon: User,
    fields: [
      { key: "include_tenant_name" as const, label: "Nome do locatário", icon: User, placeholder: "{{tenant_name}}" },
      { key: "include_tenant_document" as const, label: "CPF/CNPJ", icon: Shield, placeholder: "{{tenant_document}}" },
      { key: "include_tenant_email" as const, label: "E-mail", icon: Mail, placeholder: "{{tenant_email}}" },
      { key: "include_tenant_phone" as const, label: "Telefone", icon: Phone, placeholder: "{{tenant_phone}}" },
    ],
  },
  {
    title: "Dados do Imóvel",
    icon: Building2,
    fields: [
      { key: "include_property_address" as const, label: "Endereço do imóvel", icon: MapPin, placeholder: "{{property_address}}" },
    ],
  },
  {
    title: "Dados do Contrato",
    icon: ClipboardList,
    fields: [
      { key: "include_contract_number" as const, label: "Número do contrato", icon: Hash, placeholder: "{{contract_number}}" },
      { key: "include_contract_dates" as const, label: "Datas (início/fim)", icon: Calendar, placeholder: "{{contract_start}} / {{contract_end}}" },
      { key: "include_contract_value" as const, label: "Valor do aluguel", icon: DollarSign, placeholder: "{{contract_value}}" },
    ],
  },
  {
    title: "Dados da Fatura",
    icon: Receipt,
    fields: [
      { key: "include_invoice_number" as const, label: "Número da fatura", icon: Hash, placeholder: "{{invoice_number}}" },
      { key: "include_invoice_amount" as const, label: "Valor total", icon: DollarSign, placeholder: "{{invoice_amount}}" },
      { key: "include_invoice_due_date" as const, label: "Data de vencimento", icon: Calendar, placeholder: "{{due_date}}" },
      { key: "include_invoice_status" as const, label: "Status da fatura", icon: CheckCircle2, placeholder: "{{invoice_status}}" },
      { key: "include_invoice_breakdown" as const, label: "Detalhamento de valores", icon: FileText, placeholder: "{{invoice_breakdown}}" },
      { key: "include_reference_month" as const, label: "Mês de referência", icon: Calendar, placeholder: "{{reference_month}}" },
    ],
  },
];

type FieldKey = typeof FIELD_GROUPS[number]["fields"][number]["key"];

export default function WebhookSettings() {
  const { accountId, loading: accountLoading } = useAccountId();
  const [formData, setFormData] = useState<WebhookFormData>(defaultFormData);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!accountId) return;

    const fetchConfig = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("webhook_configs")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();

      if (!error && data) {
        setFormData({
          name: data.name,
          webhook_url: data.webhook_url,
          is_active: data.is_active,
          include_tenant_name: data.include_tenant_name,
          include_tenant_document: data.include_tenant_document,
          include_tenant_email: data.include_tenant_email,
          include_tenant_phone: data.include_tenant_phone,
          include_property_address: data.include_property_address,
          include_contract_number: data.include_contract_number,
          include_contract_dates: data.include_contract_dates,
          include_contract_value: data.include_contract_value,
          include_invoice_number: data.include_invoice_number,
          include_invoice_amount: data.include_invoice_amount,
          include_invoice_due_date: data.include_invoice_due_date,
          include_invoice_status: data.include_invoice_status,
          include_invoice_breakdown: data.include_invoice_breakdown,
          include_reference_month: data.include_reference_month,
          invoice_delivery_mode: data.invoice_delivery_mode,
          custom_message: data.custom_message || "",
          http_method: data.http_method,
          auth_type: data.auth_type,
          auth_token: data.auth_token || "",
        });
        setExistingId(data.id);
      }
      setLoading(false);
    };

    fetchConfig();
  }, [accountId]);

  const updateField = <K extends keyof WebhookFormData>(key: K, value: WebhookFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!accountId) {
      toast.error("Conta não encontrada.");
      return;
    }
    if (!formData.webhook_url) {
      toast.error("Informe a URL do webhook.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        custom_message: formData.custom_message || null,
        auth_token: formData.auth_token || null,
        custom_headers: {},
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        const { error } = await supabase
          .from("webhook_configs")
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("webhook_configs")
          .insert({ ...payload, account_id: accountId })
          .select("id")
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }

      toast.success("Configuração de webhook salva!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("Error saving webhook config:", err);
      toast.error("Erro ao salvar: " + message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!formData.webhook_url) {
      toast.error("Informe a URL do webhook antes de testar.");
      return;
    }

    setTesting(true);
    try {
      const testPayload = buildPreviewPayload();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (formData.auth_type === "bearer" && formData.auth_token) {
        headers["Authorization"] = `Bearer ${formData.auth_token}`;
      }

      const res = await fetch(formData.webhook_url, {
        method: formData.http_method,
        headers,
        body: JSON.stringify(testPayload),
      });

      if (res.ok) {
        toast.success(`Webhook respondeu com status ${res.status}. Teste bem-sucedido!`);
      } else {
        toast.error(`Webhook respondeu com erro: HTTP ${res.status}`);
      }
    } catch (err) {
      toast.error("Falha ao conectar com o webhook. Verifique a URL.");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingId) return;

    try {
      const { error } = await supabase
        .from("webhook_configs")
        .delete()
        .eq("id", existingId);
      if (error) throw error;

      setFormData(defaultFormData);
      setExistingId(null);
      toast.success("Webhook removido.");
    } catch {
      toast.error("Erro ao remover webhook.");
    }
  };

  const buildPreviewPayload = () => {
    const payload: Record<string, unknown> = {
      event: "invoice.send",
      timestamp: new Date().toISOString(),
    };

    if (formData.include_tenant_name) payload.tenant_name = "João da Silva";
    if (formData.include_tenant_document) payload.tenant_document = "123.456.789-00";
    if (formData.include_tenant_email) payload.tenant_email = "joao@email.com";
    if (formData.include_tenant_phone) payload.tenant_phone = "(11) 99999-0000";
    if (formData.include_property_address) payload.property_address = "Rua Exemplo, 123 - Centro, São Paulo/SP";
    if (formData.include_contract_number) payload.contract_number = "CTR-2026-001";
    if (formData.include_contract_dates) {
      payload.contract_start = "2026-01-01";
      payload.contract_end = "2027-01-01";
    }
    if (formData.include_contract_value) payload.contract_value = 2500.0;
    if (formData.include_invoice_number) payload.invoice_number = "FAT-2026-042";
    if (formData.include_invoice_amount) payload.invoice_amount = 2850.0;
    if (formData.include_invoice_due_date) payload.due_date = "2026-04-10";
    if (formData.include_invoice_status) payload.invoice_status = "pending";
    if (formData.include_reference_month) payload.reference_month = "2026-04";
    if (formData.include_invoice_breakdown) {
      payload.invoice_breakdown = {
        rental: 2500.0,
        condo_fee: 200.0,
        water: 80.0,
        electricity: 70.0,
      };
    }

    if (formData.invoice_delivery_mode === "pdf_attachment") {
      payload.pdf_base64 = "[base64_encoded_pdf_data]";
    } else if (formData.invoice_delivery_mode === "public_link") {
      payload.invoice_link = "https://app.locatto.com.br/fatura/abc123?auth=cpf";
    }

    if (formData.custom_message) {
      payload.message = formData.custom_message;
    }

    return payload;
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(buildPreviewPayload(), null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enabledFieldCount = FIELD_GROUPS.reduce(
    (acc, group) => acc + group.fields.filter((f) => formData[f.key]).length,
    0
  );

  if (accountLoading || loading) {
    return (
      <AppLayout title="Configuração de Webhook">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Configuração de Webhook">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure um webhook para enviar automaticamente dados de faturas para sistemas externos
            (n8n, Zapier, Make, WhatsApp API, etc). Escolha quais informações incluir no payload e
            como o arquivo da fatura será disponibilizado.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">Conexão</TabsTrigger>
            <TabsTrigger value="fields">
              Campos
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {enabledFieldCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* ===== TAB: Conexão ===== */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Endpoint do Webhook
                </CardTitle>
                <CardDescription>
                  URL que receberá os dados da fatura via HTTP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wh_name">Nome (identificação interna)</Label>
                  <Input
                    id="wh_name"
                    placeholder="Ex: Webhook WhatsApp, n8n Cobrança..."
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1 space-y-2">
                    <Label>Método</Label>
                    <Select value={formData.http_method} onValueChange={(v) => updateField("http_method", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="wh_url">URL do Webhook *</Label>
                    <Input
                      id="wh_url"
                      type="url"
                      placeholder="https://hooks.example.com/webhook/abc123"
                      value={formData.webhook_url}
                      onChange={(e) => updateField("webhook_url", e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Autenticação</Label>
                  <Select value={formData.auth_type} onValueChange={(v) => updateField("auth_type", v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.auth_type === "bearer" && (
                    <div className="space-y-2">
                      <Label htmlFor="wh_token">Token de autenticação</Label>
                      <div className="relative">
                        <Input
                          id="wh_token"
                          type={showToken ? "text" : "password"}
                          placeholder="sk-..."
                          value={formData.auth_token}
                          onChange={(e) => updateField("auth_token", e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="cursor-pointer">Webhook ativo</Label>
                    <p className="text-xs text-muted-foreground">
                      Quando desativado, nenhum dado será enviado ao webhook
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => updateField("is_active", v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Delivery Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Envio da Fatura
                </CardTitle>
                <CardDescription>
                  Como a fatura será disponibilizada no payload do webhook
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  onClick={() => updateField("invoice_delivery_mode", "public_link")}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    formData.invoice_delivery_mode === "public_link"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Link2 className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Link de acesso (recomendado)</p>
                    <p className="text-xs text-muted-foreground">
                      Envia um link onde o cliente pode visualizar e baixar a fatura autenticando com o CPF.
                      Mais seguro e econômico.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => updateField("invoice_delivery_mode", "pdf_attachment")}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    formData.invoice_delivery_mode === "pdf_attachment"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <FileText className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Arquivo PDF (base64)</p>
                    <p className="text-xs text-muted-foreground">
                      Envia o PDF da fatura codificado em base64 dentro do payload.
                      O sistema receptor precisa decodificar o arquivo.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => updateField("invoice_delivery_mode", "none")}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    formData.invoice_delivery_mode === "none"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Info className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Apenas dados (sem PDF)</p>
                    <p className="text-xs text-muted-foreground">
                      Envia somente os dados selecionados, sem arquivo ou link de fatura.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Message */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mensagem Personalizada</CardTitle>
                <CardDescription>
                  Texto opcional incluído no payload. Use placeholders como{" "}
                  <code className="text-xs bg-muted px-1 rounded">{"{{tenant_name}}"}</code>,{" "}
                  <code className="text-xs bg-muted px-1 rounded">{"{{due_date}}"}</code>,{" "}
                  <code className="text-xs bg-muted px-1 rounded">{"{{invoice_amount}}"}</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={`Olá {{tenant_name}}, sua fatura no valor de {{invoice_amount}} vence em {{due_date}}. Acesse: {{invoice_link}}`}
                  value={formData.custom_message}
                  onChange={(e) => updateField("custom_message", e.target.value)}
                  rows={4}
                />
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    "tenant_name", "tenant_document", "tenant_email", "tenant_phone",
                    "invoice_number", "invoice_amount", "due_date", "reference_month",
                    "contract_number", "property_address", "invoice_link",
                  ].map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer text-[10px] hover:bg-primary/10"
                      onClick={() => {
                        updateField("custom_message", formData.custom_message + `{{${tag}}}`);
                      }}
                    >
                      {`{{${tag}}}`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB: Campos ===== */}
          <TabsContent value="fields" className="space-y-4">
            {FIELD_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <Card key={group.title}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <GroupIcon className="h-4 w-4" />
                      {group.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {group.fields.map((field) => {
                      const FieldIcon = field.icon;
                      return (
                        <div
                          key={field.key}
                          className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FieldIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">{field.label}</span>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {field.placeholder}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={formData[field.key] as boolean}
                            onCheckedChange={(v) => updateField(field.key, v)}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ===== TAB: Preview ===== */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Preview do Payload</CardTitle>
                    <CardDescription>
                      Este é o JSON que será enviado ao webhook quando uma fatura for disparada
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyPayload}>
                    {copied ? (
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-950 text-slate-50 rounded-lg p-4 text-xs overflow-x-auto max-h-[500px] overflow-y-auto">
                  <code>{JSON.stringify(buildPreviewPayload(), null, 2)}</code>
                </pre>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Os dados acima são de exemplo. Em produção, serão preenchidos com os dados reais
                da fatura e do locatário no momento do envio.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <div>
            {existingId && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remover Webhook
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleTest} disabled={testing || saving}>
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar Teste
            </Button>
            <Button onClick={handleSave} disabled={saving || testing}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Configuração
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
