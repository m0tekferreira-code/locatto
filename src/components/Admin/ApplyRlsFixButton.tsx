import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export function ApplyRlsFixButton() {
  const [isApplying, setIsApplying] = useState(false);
  const [hasBeenApplied, setHasBeenApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const applyFix = async () => {
    try {
      setIsApplying(true);
      setError(null);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Você precisa estar autenticado");
      }

      // Chamar Edge Function
      const { data, error: functionError } = await supabase.functions.invoke(
        'apply-rls-fix',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (data?.success) {
        setHasBeenApplied(true);
        toast({
          title: "✅ Fix aplicado com sucesso!",
          description: "As políticas RLS foram corrigidas. A página será recarregada em 3 segundos.",
          duration: 3000,
        });

        // Recarregar página após 3 segundos
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("Erro ao aplicar fix:", err);
      
      const errorMessage = err instanceof Error ? err.message : "Erro ao aplicar fix de RLS";
      setError(errorMessage);
      
      toast({
        title: "❌ Erro ao aplicar fix",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Shield className="h-5 w-5" />
          Correção de Políticas RLS
        </CardTitle>
        <CardDescription>
          Se você está enfrentando erros 403 ao cadastrar imóveis ou o loader trava em 93%,
          clique no botão abaixo para aplicar a correção automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>
              {error}
              <br />
              <br />
              <strong>Solução alternativa:</strong> Execute o SQL manualmente no{" "}
              <a
                href="https://supabase.com/dashboard/project/esinwvukarglzeoxioni/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Supabase Dashboard
              </a>
              . Copie o conteúdo do arquivo <code>APPLY_THIS_FIX_NOW.sql</code>.
            </AlertDescription>
          </Alert>
        )}

        {hasBeenApplied && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Sucesso!</AlertTitle>
            <AlertDescription className="text-green-800">
              O fix foi aplicado com sucesso. A página será recarregada automaticamente.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Button
            onClick={applyFix}
            disabled={isApplying || hasBeenApplied}
            size="lg"
            className="w-full"
          >
            {isApplying && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isApplying
              ? "Aplicando correção..."
              : hasBeenApplied
              ? "✅ Correção aplicada"
              : "🔧 Aplicar Correção de RLS Agora"}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Esta ação requer permissões de administrador
          </p>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>O que este botão faz:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Cria a política RLS de INSERT em profiles</li>
            <li>Atualiza a função get_user_account_id com fallback</li>
            <li>Sincroniza profiles com suas contas (backfill)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
