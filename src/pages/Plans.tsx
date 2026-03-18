import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, CreditCard } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "comeco",
    name: "COMEÇO",
    price: 149,
    oldPrice: 199,
    description: "Estrutura básica para gestão de imóveis",
    badge: "COMEÇO",
    features: [
      "1 usuário",
      "Até 10 imóveis cadastrados",
      "Gestão básica de contratos",
      "Suporte técnico 1:1",
      "Integração com WhatsApp",
      "IA para atendimento básico",
    ],
  },
  {
    id: "impulso",
    name: "IMPULSO",
    price: 299,
    oldPrice: 399,
    description: "Para imobiliárias em crescimento",
    badge: "IMPULSO",
    features: [
      "5 usuários",
      "Até 50 imóveis cadastrados",
      "Gestão completa de contratos",
      "Integração com equipe de suporte",
      "Suporte técnico 1:1",
      "IA avançada para qualificação",
      "Integração com WhatsApp",
      "Relatórios personalizados",
    ],
  },
  {
    id: "escalavel",
    name: "ESCALÁVEL",
    price: 369,
    oldPrice: 499,
    description: "Empresas com times dedicados",
    badge: "ESCALÁVEL",
    highlighted: true,
    features: [
      "10 usuários",
      "Até 150 imóveis cadastrados",
      "Gestão avançada de contratos",
      "Integração com equipe de suporte",
      "Suporte técnico 1:1",
      "IA completa para conversão",
      "Integração com WhatsApp",
      "Relatórios e analytics avançados",
      "API para integrações",
    ],
  },
  {
    id: "profissional",
    name: "PROFISSIONAL",
    price: 739,
    oldPrice: 899,
    description: "Empresas com processos comerciais e integrações avançadas",
    badge: "PROFISSIONAL",
    features: [
      "25 usuários",
      "Imóveis ilimitados",
      "Gestão empresarial completa",
      "Integração com equipe de suporte",
      "Suporte técnico 1:1",
      "IA completa personalizada",
      "Integração com WhatsApp",
      "Relatórios enterprise",
      "API e webhooks ilimitados",
      "Consultoria dedicada",
    ],
  },
];

export default function Plans() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    navigate(`/register?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Selecione o seu plano
            </h1>
            <p className="text-slate-300">
              e reinvente seu atendimento hoje mesmo
            </p>
          </div>
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

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-transform hover:scale-105 ${
                plan.highlighted
                  ? "bg-blue-600 border-blue-500"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              {plan.badge && (
                <div
                  className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold ${
                    plan.highlighted
                      ? "bg-white text-blue-600"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <CardContent className="p-6 pt-16">
                <div className="mb-4">
                  {plan.oldPrice && (
                    <p className="text-sm text-slate-400 line-through">
                      R$ {plan.oldPrice.toFixed(2)}
                    </p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-bold ${
                        plan.highlighted ? "text-white" : "text-white"
                      }`}
                    >
                      R$
                    </span>
                    <span
                      className={`text-5xl font-bold ${
                        plan.highlighted ? "text-white" : "text-white"
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={`text-sm ${
                        plan.highlighted ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      /mês
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-2 ${
                      plan.highlighted ? "text-blue-100" : "text-slate-300"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check
                        className={`flex-shrink-0 mt-0.5 ${
                          plan.highlighted ? "text-white" : "text-green-500"
                        }`}
                        size={18}
                      />
                      <span
                        className={`text-sm ${
                          plan.highlighted ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full font-semibold rounded-xl py-6 ${
                    plan.highlighted
                      ? "bg-white text-blue-600 hover:bg-slate-100"
                      : "bg-slate-900 text-white hover:bg-slate-950 border border-slate-600"
                  }`}
                >
                  <CreditCard className="mr-2" size={18} />
                  COMECE AGORA
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-slate-400">
            Quer saber mais?{" "}
            <a href="#" className="text-blue-400 underline hover:text-blue-300">
              Clique aqui!
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
