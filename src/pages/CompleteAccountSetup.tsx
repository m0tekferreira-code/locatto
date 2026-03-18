import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function CompleteAccountSetup() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const defaultAccountName = useMemo(() => {
    const companyName = user?.user_metadata?.company_name as string | undefined;
    const legacyCompany = user?.user_metadata?.company as string | undefined;
    return (companyName || legacyCompany || "").trim();
  }, [user]);
  const [accountName, setAccountName] = useState(defaultAccountName);
  const [loading, setLoading] = useState(false);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const name = accountName.trim();
    if (!name) {
      toast.error("Informe o nome da conta.");
      return;
    }

    setLoading(true);

    try {
      const { data: createdAccount, error: accountError } = await supabase
        .from("accounts")
        .insert({
          owner_id: user.id,
          account_name: name,
          subscription_status: "trial",
        })
        .select("id")
        .single();

      if (accountError) throw accountError;

      // EMERGENCY FIX: Profile will be created automatically by handle_new_user trigger
      // or linked via SQL migration. Skip manual upsert to avoid 403 until RLS fix is applied.

      toast.success("Cadastro concluído com sucesso.");
      navigate("/");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível concluir o cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Completar Cadastro</CardTitle>
          <CardDescription>
            Para continuar, finalize a criação da sua conta principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Nome da conta</Label>
              <Input
                id="account-name"
                placeholder="Ex.: Imobiliária Alfa"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Salvando..." : "Concluir cadastro"}
              </Button>
              <Button type="button" variant="outline" onClick={signOut} disabled={loading}>
                Sair
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
