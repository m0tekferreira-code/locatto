import { useState } from "react";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header, SidebarAvailableContext } from "@/components/Layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bell, Mail, MessageSquare, Clock, AlertCircle, CheckCircle, 
  Play, BookOpen, ExternalLink, Settings
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const NotificationSettings = () => {
  const isMobile = useIsMobile();
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const handleTestNotifications = async () => {
    setIsTestingEmail(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('invoice-reminders', {
        body: {},
      });

      if (error) throw error;

      setLastRun(new Date());
      toast.success('Verificação executada com sucesso!', {
        description: `${data.notificationsSent} notificação(ões) enviada(s)`,
      });
    } catch (error: any) {
      console.error('Erro ao testar notificações:', error);
      toast.error('Erro ao executar verificação', {
        description: error.message,
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <SidebarAvailableContext.Provider value={true}>
        <div className="flex h-screen w-full bg-background">
          <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Notificações e Lembretes" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Status do Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Sistema de Notificações
                </CardTitle>
                <CardDescription>
                  Alertas automáticos para faturas vencidas e próximas do vencimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Edge Function Configurada</p>
                      <p className="text-sm text-muted-foreground">
                        invoice-reminders está ativa
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-blue-500/10">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Verificação Diária</p>
                      <p className="text-sm text-muted-foreground">
                        Executa automaticamente às 9h UTC (6h Brasília)
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Agendado</Badge>
                </div>

                {lastRun && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full p-2 bg-purple-500/10">
                        <Play className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">Última Execução Manual</p>
                        <p className="text-sm text-muted-foreground">
                          {lastRun.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Canais de Notificação */}
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-5 w-5" />
                    Email (Resend)
                  </CardTitle>
                  <CardDescription>
                    Notificações profissionais via email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Template para faturas vencidas
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Template para lembretes
                    </p>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Configure os templates no workflow n8n
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-5 w-5" />
                    WhatsApp (Evolution API)
                  </CardTitle>
                  <CardDescription>
                    Mensagens instantâneas via WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Mensagem de cobrança
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Mensagem de aviso
                    </p>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Necessita Evolution API configurada no n8n
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Lógica de Detecção */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Regras de Notificação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-red-500/5 border-red-200">
                    <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Faturas Vencidas
                    </h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Status: Pendente</li>
                      <li>• Data de vencimento: Anterior a hoje</li>
                      <li>• Ação: Cobrança urgente</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg bg-yellow-500/5 border-yellow-200">
                    <h3 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Vencimento Próximo
                    </h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Status: Pendente</li>
                      <li>• Vencimento: Próximos 3 dias</li>
                      <li>• Ação: Lembrete amigável</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <Card>
              <CardHeader>
                <CardTitle>Teste e Configuração</CardTitle>
                <CardDescription>
                  Execute verificações manuais e acesse a documentação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    onClick={handleTestNotifications}
                    disabled={isTestingEmail}
                    className="flex-1"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isTestingEmail ? 'Executando...' : 'Testar Agora'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://supabase.com/dashboard/project/yvlzmbamsqzqqbhdrqwk/functions/invoice-reminders/logs', '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver Logs
                  </Button>
                </div>

                <Alert>
                  <BookOpen className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Documentação completa:</strong> Consulte o arquivo{' '}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      docs/invoice-reminders-setup.md
                    </code>{' '}
                    para instruções detalhadas de configuração do n8n, Evolution API e cron job.
                  </AlertDescription>
                </Alert>

                <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-semibold text-sm">Próximos Passos:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Configure o webhook do n8n com os templates</li>
                    <li>Execute o SQL do cron job no Supabase SQL Editor</li>
                    <li>Teste a função manualmente usando o botão acima</li>
                    <li>Verifique os logs para confirmar o funcionamento</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
        </div>
      </SidebarAvailableContext.Provider>
    </SidebarProvider>
  );
};

export default NotificationSettings;