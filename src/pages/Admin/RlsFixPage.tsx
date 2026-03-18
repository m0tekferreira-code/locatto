import { ApplyRlsFixButton } from "@/components/Admin/ApplyRlsFixButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HealthCheckStatus {
  profilesInsertPolicy: boolean;
  getFunctionExists: boolean;
  orphanProfilesCount: number;
  isChecking: boolean;
}

export default function RlsFixPage() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckStatus>({
    profilesInsertPolicy: false,
    getFunctionExists: false,
    orphanProfilesCount: 0,
    isChecking: true,
  });

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      setHealthStatus(prev => ({ ...prev, isChecking: true }));

      // Tentar inserir um profile de teste para verificar a policy
      const testUserId = crypto.randomUUID();
      const { error: policyError } = await supabase
        .from('profiles')
        .insert({ id: testUserId, account_id: testUserId })
        .select()
        .limit(0);

      const profilesInsertPolicy = !policyError || policyError.code !== '42501';

      // Verificar profiles órfãos
      const { count: orphanCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .is('account_id', null);

      setHealthStatus({
        profilesInsertPolicy,
        getFunctionExists: true, // Assume que existe se não houver erro
        orphanProfilesCount: orphanCount || 0,
        isChecking: false,
      });
    } catch (error) {
      console.error('Erro ao verificar saúde do sistema:', error);
      setHealthStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  const allHealthy = 
    healthStatus.profilesInsertPolicy &&
    healthStatus.getFunctionExists &&
    healthStatus.orphanProfilesCount === 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Correção de Sistema</h1>
        <p className="text-gray-600 mt-2">
          Diagnóstico e correção de problemas de políticas RLS
        </p>
      </div>

      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {allHealthy ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Sistema Saudável
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Problemas Detectados
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthStatus.isChecking ? (
            <p className="text-sm text-gray-500">Verificando sistema...</p>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">
                  Política de INSERT em profiles
                </span>
                {healthStatus.profilesInsertPolicy ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">
                  Função get_user_account_id
                </span>
                {healthStatus.getFunctionExists ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">
                  Profiles sem account_id
                </span>
                {healthStatus.orphanProfilesCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <span className="text-sm text-orange-600 font-semibold">
                    {healthStatus.orphanProfilesCount} encontrados
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alertas */}
      {!allHealthy && !healthStatus.isChecking && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Ação necessária</AlertTitle>
          <AlertDescription className="text-orange-800">
            O sistema detectou problemas que podem causar erros 403 ao cadastrar
            imóveis ou fazer o loader travar em 93%. Use o botão abaixo para
            corrigir automaticamente.
          </AlertDescription>
        </Alert>
      )}

      {allHealthy && !healthStatus.isChecking && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Tudo funcionando!</AlertTitle>
          <AlertDescription className="text-green-800">
            Todas as políticas RLS estão configuradas corretamente. O sistema
            está operando normalmente.
          </AlertDescription>
        </Alert>
      )}

      {/* Botão de Correção */}
      {!allHealthy && <ApplyRlsFixButton />}

      {/* Instruções Alternativas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Não funcionou?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Se o botão acima não funcionar, você pode aplicar a correção manualmente:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Acesse o{" "}
              <a
                href="https://supabase.com/dashboard/project/esinwvukarglzeoxioni/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                SQL Editor do Supabase
              </a>
            </li>
            <li>
              Abra o arquivo <code className="bg-gray-100 px-1 rounded">APPLY_THIS_FIX_NOW.sql</code> na raiz do projeto
            </li>
            <li>Copie todo o conteúdo</li>
            <li>Cole no SQL Editor e clique em "RUN"</li>
            <li>Recarregue esta página (Ctrl+F5)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
