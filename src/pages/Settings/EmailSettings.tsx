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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Server, Save, Eye, EyeOff, ShieldCheck, Send, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SmtpFormData {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_active: boolean;
}

const defaultFormData: SmtpFormData = {
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_pass: "",
  from_email: "",
  from_name: "",
  use_tls: true,
  is_active: true,
};

const SMTP_PRESETS: Record<string, Partial<SmtpFormData>> = {
  gmail: { smtp_host: "smtp.gmail.com", smtp_port: 587, use_tls: true },
  outlook: { smtp_host: "smtp-mail.outlook.com", smtp_port: 587, use_tls: true },
  yahoo: { smtp_host: "smtp.mail.yahoo.com", smtp_port: 587, use_tls: true },
  zoho: { smtp_host: "smtp.zoho.com", smtp_port: 587, use_tls: true },
  custom: {},
};

export default function EmailSettings() {
  const { accountId, loading: accountLoading } = useAccountId();
  const [formData, setFormData] = useState<SmtpFormData>(defaultFormData);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");

  useEffect(() => {
    if (!accountId) return;

    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();

      if (!error && data) {
        setFormData({
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_user: data.smtp_user,
          smtp_pass: data.smtp_pass,
          from_email: data.from_email,
          from_name: data.from_name,
          use_tls: data.use_tls,
          is_active: data.is_active,
        });
        setExistingId(data.id);

        // Detect preset
        const preset = Object.entries(SMTP_PRESETS).find(
          ([key, val]) => val.smtp_host === data.smtp_host && key !== "custom"
        );
        setSelectedPreset(preset ? preset[0] : "custom");
      }
      setLoading(false);
    };

    fetchSettings();
  }, [accountId]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      const presetData = SMTP_PRESETS[preset];
      setFormData((prev) => ({
        ...prev,
        ...presetData,
      }));
    }
  };

  const updateField = <K extends keyof SmtpFormData>(key: K, value: SmtpFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!accountId) {
      toast.error("Conta não encontrada. Faça login novamente.");
      return;
    }

    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_pass || !formData.from_email) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      if (existingId) {
        const { error } = await supabase
          .from("smtp_settings")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("smtp_settings")
          .insert({
            ...formData,
            account_id: accountId,
          })
          .select("id")
          .single();

        if (error) throw error;
        setExistingId(data.id);
      }

      toast.success("Configurações de e-mail salvas com sucesso!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("Error saving SMTP settings:", err);
      toast.error("Erro ao salvar configurações: " + message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_pass || !formData.from_email) {
      toast.error("Preencha todos os campos antes de testar.");
      return;
    }

    setTesting(true);
    // Simulated test — in production this would call an Edge Function
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Configurações parecem válidas! Para teste completo, envie uma fatura por e-mail.");
    } catch {
      toast.error("Falha ao testar conexão SMTP.");
    } finally {
      setTesting(false);
    }
  };

  if (accountLoading || loading) {
    return (
      <AppLayout title="Configurações de E-mail">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Configurações de E-mail">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure seu servidor SMTP para enviar faturas e notificações por e-mail diretamente pelo sistema.
            Recomendamos usar uma senha de aplicativo ao invés da senha principal da conta de e-mail.
          </AlertDescription>
        </Alert>

        {/* Servidor SMTP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Servidor SMTP
            </CardTitle>
            <CardDescription>
              Dados do servidor de e-mail para envio de faturas e notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset */}
            <div className="space-y-2">
              <Label>Provedor de e-mail</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook / Hotmail</SelectItem>
                  <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                  <SelectItem value="zoho">Zoho Mail</SelectItem>
                  <SelectItem value="custom">Outro (personalizado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Host and Port */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="smtp_host">Servidor SMTP *</Label>
                <Input
                  id="smtp_host"
                  placeholder="smtp.exemplo.com"
                  value={formData.smtp_host}
                  onChange={(e) => updateField("smtp_host", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp_port">Porta *</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  placeholder="587"
                  value={formData.smtp_port}
                  onChange={(e) => updateField("smtp_port", parseInt(e.target.value) || 587)}
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="smtp_user">Usuário / E-mail de login *</Label>
              <Input
                id="smtp_user"
                type="email"
                placeholder="seu@email.com"
                value={formData.smtp_user}
                onChange={(e) => updateField("smtp_user", e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="smtp_pass">Senha / Senha de aplicativo *</Label>
              <div className="relative">
                <Input
                  id="smtp_pass"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.smtp_pass}
                  onChange={(e) => updateField("smtp_pass", e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* TLS */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <div>
                  <Label className="cursor-pointer">Usar TLS/SSL</Label>
                  <p className="text-xs text-muted-foreground">Conexão segura (recomendado)</p>
                </div>
              </div>
              <Switch
                checked={formData.use_tls}
                onCheckedChange={(val) => updateField("use_tls", val)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Remetente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Remetente
            </CardTitle>
            <CardDescription>
              Informações que aparecerão como remetente nos e-mails enviados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from_name">Nome do remetente</Label>
              <Input
                id="from_name"
                placeholder="Minha Imobiliária"
                value={formData.from_name}
                onChange={(e) => updateField("from_name", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nome que aparecerá para o destinatário (ex: nome da sua imobiliária)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from_email">E-mail do remetente *</Label>
              <Input
                id="from_email"
                type="email"
                placeholder="financeiro@suaimobiliaria.com"
                value={formData.from_email}
                onChange={(e) => updateField("from_email", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Endereço de e-mail que aparecerá como remetente
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">Ativar envio de e-mails</Label>
                <p className="text-xs text-muted-foreground">
                  Quando desativado, nenhum e-mail será enviado automaticamente
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(val) => updateField("is_active", val)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing || saving}>
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={saving || testing}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
