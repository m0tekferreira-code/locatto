import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

const plans: Record<string, Plan> = {
  comeco: {
    id: "comeco",
    name: "COMEÇO",
    price: 149,
    features: [
      "1 usuário",
      "Até 10 imóveis cadastrados",
      "Gestão básica de contratos",
      "Suporte técnico 1:1",
      "Integração com WhatsApp",
      "IA para atendimento básico",
    ],
  },
  impulso: {
    id: "impulso",
    name: "IMPULSO",
    price: 299,
    features: [
      "5 usuários",
      "Até 50 imóveis cadastrados",
      "Gestão completa de contratos",
      "Integração com equipe de suporte",
      "Suporte técnico 1:1",
      "IA avançada para qualificação",
    ],
  },
  escalavel: {
    id: "escalavel",
    name: "ESCALÁVEL",
    price: 369,
    features: [
      "10 usuários",
      "Até 150 imóveis cadastrados",
      "Gestão avançada de contratos",
      "Suporte técnico 1:1",
      "IA completa para conversão",
    ],
  },
  profissional: {
    id: "profissional",
    name: "PROFISSIONAL",
    price: 739,
    features: [
      "25 usuários",
      "Imóveis ilimitados",
      "Gestão empresarial completa",
      "IA completa personalizada",
      "Consultoria dedicada",
    ],
  },
};

export default function CheckoutPlan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const planId = searchParams.get("plan") || "comeco";
  const selectedPlan = plans[planId];

  useEffect(() => {
    if (!selectedPlan) {
      navigate("/plans");
    }
  }, [selectedPlan, navigate]);

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro de autenticação",
          description: "Sessão expirada. Faça login novamente.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      console.log('Creating checkout session for plan:', planId);

      const { data, error } = await supabase.functions.invoke('checkout-session', {
        body: { planId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Checkout session error:', error);
        throw error;
      }

      console.log('Checkout session created:', data);

      // Store session ID in sessionStorage for polling
      sessionStorage.setItem('checkout_session_id', data.sessionId);

      // Redirect to Cakto payment page
      window.location.href = data.providerLink;

    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível criar a sessão de pagamento. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (!selectedPlan) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Selecione o seu plano
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-300">{user?.email}</span>
            <Button
              variant="outline"
              onClick={signOut}
              className="bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              Sair
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Plan Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 sticky top-8">
              <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold mb-4">
                Plano - {selectedPlan.name}
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {selectedPlan.name}
              </h2>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-bold text-white">R$</span>
                <span className="text-5xl font-bold text-white">
                  {selectedPlan.price}
                </span>
                <span className="text-slate-400">/mês</span>
              </div>

              <div className="space-y-3">
                {selectedPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="bg-blue-600 rounded-full p-1 mt-0.5">
                      <Check className="text-white" size={12} />
                    </div>
                    <span className="text-sm text-slate-200">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Assinar Plano {selectedPlan.name}
                  </h3>
                  <p className="text-slate-400">
                    R$ {selectedPlan.price.toFixed(2)} por mês
                  </p>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-300">
                    Ao clicar em "Assinar", você será redirecionado para a página de pagamento segura da Cakto.
                    Após a confirmação do pagamento, sua licença será ativada automaticamente.
                  </p>
                </div>

                <Button
                  onClick={handleSubscribe}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-xl"
                  disabled={loading}
                >
                  {loading ? "Redirecionando..." : "Assinar agora"}
                </Button>

                <div className="text-center text-xs text-slate-400 space-y-1">
                  <p>
                    Powered by{" "}
                    <span className="text-blue-400 font-semibold">Cakto</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
