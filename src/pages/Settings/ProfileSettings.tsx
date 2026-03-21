import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, KeyRound, User, Building2, Mail } from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  full_name: string;
  avatar_url: string | null;
}

interface AccountData {
  account_name: string;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({ full_name: "", avatar_url: null });
  const [account, setAccount] = useState<AccountData>({ account_name: "" });
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email ?? "");
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            setProfile({ full_name: data.full_name ?? "", avatar_url: data.avatar_url });
            if (data.avatar_url) setAvatarPreview(data.avatar_url);
          }
        });
    }
  }, [user]);

  useEffect(() => {
    if (accountId) {
      supabase
        .from("accounts")
        .select("account_name")
        .eq("id", accountId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            setAccount({ account_name: data.account_name ?? "" });
          }
        });
    }
  }, [accountId]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2 MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      let avatar_url = profile.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatar_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profile.full_name, avatar_url, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;

      setProfile((p) => ({ ...p, avatar_url }));
      setAvatarFile(null);
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao salvar perfil: " + msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!user || !email.trim()) return;
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success("E-mail de confirmação enviado. Verifique sua caixa de entrada.");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao atualizar e-mail: " + msg);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha atualizada com sucesso!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao atualizar senha: " + msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveBusiness = async () => {
    if (!accountId) return;
    setSavingBusiness(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ account_name: account.account_name, updated_at: new Date().toISOString() })
        .eq("id", accountId);
      if (error) throw error;
      toast.success("Nome do negócio atualizado!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao salvar: " + msg);
    } finally {
      setSavingBusiness(false);
    }
  };

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <AppLayout title="Perfil e Configurações">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Perfil e Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e da conta.</p>
        </div>

        {/* Profile Photo + Name */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil Pessoal
            </CardTitle>
            <CardDescription>Foto, nome e informações do seu perfil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarPreview ?? undefined} />
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  aria-label="Alterar foto de perfil"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow hover:bg-primary/90 transition"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Selecionar foto de perfil"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>JPG, PNG ou WebP. Máximo 2 MB.</p>
                {avatarFile && (
                  <p className="text-primary mt-1">Nova foto selecionada: {avatarFile.name}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Seu nome completo"
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              <Save className="mr-2 h-4 w-4" />
              {savingProfile ? "Salvando..." : "Salvar perfil"}
            </Button>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-mail de acesso
            </CardTitle>
            <CardDescription>
              Ao alterar, um e-mail de confirmação será enviado para o novo endereço.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <Button onClick={handleSaveEmail} disabled={savingEmail}>
              <Save className="mr-2 h-4 w-4" />
              {savingEmail ? "Enviando..." : "Atualizar e-mail"}
            </Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Senha
            </CardTitle>
            <CardDescription>Altere sua senha de acesso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova senha</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar nova senha</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button onClick={handleSavePassword} disabled={savingPassword || !newPassword}>
              <KeyRound className="mr-2 h-4 w-4" />
              {savingPassword ? "Salvando..." : "Alterar senha"}
            </Button>
          </CardContent>
        </Card>

        {/* Business */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados do Negócio
            </CardTitle>
            <CardDescription>Nome da sua empresa ou imobiliária exibido na plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Nome do negócio</Label>
              <Input
                id="account_name"
                value={account.account_name}
                onChange={(e) => setAccount({ account_name: e.target.value })}
                placeholder="Ex: Imobiliária Central"
              />
            </div>
            <Button onClick={handleSaveBusiness} disabled={savingBusiness}>
              <Save className="mr-2 h-4 w-4" />
              {savingBusiness ? "Salvando..." : "Salvar negócio"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
