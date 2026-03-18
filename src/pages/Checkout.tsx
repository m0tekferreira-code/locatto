import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Mail, HelpCircle, CheckCircle2, Loader2 } from "lucide-react";

const Checkout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  useEffect(() => {
    const sessionId = sessionStorage.getItem('checkout_session_id');
    
    if (sessionId && !pollingActive) {
      setPollingActive(true);
      startPaymentPolling(sessionId);
    }
  }, []);

  const startPaymentPolling = async (sessionId: string) => {
    console.log('Starting payment polling for session:', sessionId);
    setCheckingPayment(true);

    const maxAttempts = 60; // 5 minutes (60 * 5 seconds)
    let attempts = 0;

    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          clearInterval(pollInterval);
          setCheckingPayment(false);
          return;
        }

        console.log(`Checking payment status (attempt ${attempts}/${maxAttempts})`);

        const url = new URL('https://yvlzmbamsqzqqbhdrqwk.supabase.co/functions/v1/check-payment-status');
        url.searchParams.set('sessionId', sessionId);

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          console.error('Error checking payment status');
          return;
        }

        const data = await response.json();

        console.log('Payment status:', data);

        if (data.status === 'paid') {
          clearInterval(pollInterval);
          sessionStorage.removeItem('checkout_session_id');
          sessionStorage.removeItem('license_check'); // Clear license cache
          
          toast({
            title: "Pagamento confirmado!",
            description: "Sua licença foi ativada com sucesso.",
          });
          
          setCheckingPayment(false);
          navigate('/');
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setCheckingPayment(false);
          toast({
            title: "Tempo esgotado",
            description: "Não foi possível confirmar o pagamento automaticamente. Entre em contato com o suporte.",
            variant: "destructive",
          });
        }

      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(pollInterval);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('checkout_session_id');
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado do sistema.",
    });
    navigate("/auth");
  };

  const handleRenewLicense = () => {
    navigate('/plans');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {checkingPayment ? "Verificando Pagamento..." : "Licença Expirada"}
          </CardTitle>
          <CardDescription>
            {checkingPayment 
              ? "Aguardando confirmação do pagamento. Isso pode levar alguns minutos."
              : "Sua licença expirou. Renove para continuar usando o sistema."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {checkingPayment ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Verificando status do pagamento...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Plano Mensal</p>
                  <p className="text-3xl font-bold">R$ 149,00<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">O plano inclui:</p>
                  <ul className="space-y-2">
                    {[
                      "Gestão completa de imóveis",
                      "Contratos e faturas ilimitados",
                      "Relatórios e documentos",
                      "Suporte prioritário",
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleRenewLicense}
              >
                Renovar Licença
              </Button>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => window.open('mailto:suporte@seudominio.com', '_blank')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Contatar Suporte
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('https://seudominio.com/ajuda', '_blank')}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Central de Ajuda
            </Button>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair da Conta
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Após a renovação, sua licença será ativada automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Checkout;