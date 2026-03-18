import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Check, CreditCard, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const planId = searchParams.get("plan");
  const selectedPlan = planId ? plans[planId] : null;

  useEffect(() => {
    if (!selectedPlan) {
      toast({
        title: "Plano não encontrado",
        description: "Por favor, selecione um plano para continuar.",
      });
      navigate("/plans");
    }
  }, [selectedPlan, navigate, toast]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirmPassword: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    cardName: "",
    cardDocument: "",
  });

  if (!selectedPlan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const companyName = formData.company.trim();

    if (!companyName) {
      toast({
        title: "Erro",
        description: "Informe o nome da empresa para criar a conta.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCvc) {
      toast({
        title: "Dados de pagamento",
        description: "Preencha os dados do cartão de crédito (ambiente de teste).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            company_name: companyName,
            company: companyName,
            plan_id: selectedPlan.id,
            subscription_status: "active"
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Pagamento aprovado e conta criada!",
        description: "Bem vindo ao Acordus.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta ou processar pagamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="w-full md:w-[40%] bg-slate-900 border-r border-slate-800 p-8 md:p-12 lg:p-16 flex flex-col text-slate-200">
        <div className="mb-12 cursor-pointer" onClick={() => navigate("/")}>
          <span className="text-2xl font-bold text-white tracking-tight">Acordus</span>
        </div>
        
        <div>
          <h2 className="text-slate-400 font-medium mb-2 uppercase text-sm tracking-wider">
            Resumo do Pedido
          </h2>
          <div className="flex items-baseline gap-2 mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">
              Plano {selectedPlan.name}
            </h1>
          </div>
          
          <div className="flex items-end gap-2 mb-8 pb-8 border-b border-slate-800">
            <span className="text-5xl font-bold text-white">R$ {selectedPlan.price}</span>
            <span className="text-slate-400 mb-1">/ mês</span>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">O que está incluído:</h3>
            <ul className="space-y-3">
              {selectedPlan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-1 rounded-full text-blue-400">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-auto pt-16">
          <p className="text-sm text-slate-500">
            Trata-se de um ambiente de desenvolvimento. O cartão não será cobrado de verdade.
          </p>
        </div>
      </div>

      <div className="w-full md:w-[60%] bg-white p-8 md:p-12 lg:p-16 lg:px-24 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Dados da Empresa e Pessoais</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Nome da Empresa *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email corporativo *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha de acesso *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Pagamento</h2>
              <div className="flex gap-1 ml-auto">
                <div className="h-6 w-10 bg-slate-100 rounded border flex items-center justify-center text-[10px] font-bold text-slate-500">VISA</div>
                <div className="h-6 w-10 bg-slate-100 rounded border flex items-center justify-center text-[10px] font-bold text-slate-500">MC</div>
              </div>
            </div>

            <Card className="border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                <CreditCard className="text-slate-500" />
                <span className="font-medium">Cartão de Crédito</span>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Número do Cartão</Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      placeholder="0000 0000 0000 0000"
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                      maxLength={19}
                      className="font-mono text-sm"
                    />
                    <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardExpiry">Validade</Label>
                    <Input
                      id="cardExpiry"
                      placeholder="MM/AA"
                      value={formData.cardExpiry}
                      onChange={(e) => setFormData({ ...formData, cardExpiry: e.target.value })}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardCvc">CVC</Label>
                    <Input
                      id="cardCvc"
                      placeholder="123"
                      value={formData.cardCvc}
                      onChange={(e) => setFormData({ ...formData, cardCvc: e.target.value })}
                      maxLength={4}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardName">Nome impresso no cartão</Label>
                  <Input
                    id="cardName"
                    value={formData.cardName}
                    onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                    placeholder="JOAO A DA SILVA"
                    className="uppercase"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cardDocument">CPF / CNPJ do titular</Label>
                  <Input
                    id="cardDocument"
                    value={formData.cardDocument}
                    onChange={(e) => setFormData({ ...formData, cardDocument: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-base py-6 bg-blue-600 hover:bg-blue-700 h-auto font-bold shadow-md shadow-blue-600/20"
            disabled={loading}
          >
            {loading ? "Processando..." : "Assinar por R$ " + selectedPlan.price + "/mês"}
          </Button>

          <p className="text-center text-sm text-slate-500 flex items-center justify-center gap-1.5">
            <Lock size={12} /> Pagamento seguro criptografado
          </p>
        </form>
      </div>
    </div>
  );
}
