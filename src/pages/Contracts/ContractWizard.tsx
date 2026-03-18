import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, FileCheck, Shield, User, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";

const ContractWizard = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Tenant data
    tenant_name: "",
    tenant_document: "",
    tenant_rg: "",
    tenant_email: "",
    tenant_phone: "",
    tenant_profession: "",
    tenant_emergency_phone: "",
    co_tenants: [] as Array<{ name: string; document: string; relationship: string }>,
    
    // Step 2: Contract data
    contract_number: "",
    start_date: "",
    end_date: "",
    rental_value: "",
    payment_day: "5",
    payment_method: "bank_transfer",
    adjustment_index: "",
    pre_paid: false,
    
    // Step 3: Guarantee
    guarantee_type: "",
    guarantee_value: "",
  });

  const { data: property } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const steps = [
    { number: 1, title: "Dados do Inquilino", icon: User },
    { number: 2, title: "Dados do Contrato", icon: FileCheck },
    { number: 3, title: "Garantia", icon: Shield },
    { number: 4, title: "Revisão", icon: Check },
  ];

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!formData.tenant_name || !formData.tenant_phone) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha o nome e telefone do inquilino",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (currentStep === 2) {
      if (!formData.start_date || !formData.rental_value) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha a data de início e o valor do aluguel",
          variant: "destructive",
        });
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("contracts").insert({
        user_id: user?.id,
        account_id: accountId,
        property_id: propertyId,
        tenant_name: formData.tenant_name,
        tenant_document: formData.tenant_document || null,
        tenant_rg: formData.tenant_rg || null,
        tenant_email: formData.tenant_email || null,
        tenant_phone: formData.tenant_phone,
        tenant_profession: formData.tenant_profession || null,
        tenant_emergency_phone: formData.tenant_emergency_phone || null,
        co_tenants: formData.co_tenants.length > 0 ? formData.co_tenants : null,
        contract_number: formData.contract_number || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        rental_value: parseFloat(formData.rental_value),
        payment_day: parseInt(formData.payment_day),
        payment_method: formData.payment_method,
        adjustment_index: formData.adjustment_index || null,
        pre_paid: formData.pre_paid,
        guarantee_type: formData.guarantee_type || null,
        guarantee_value: formData.guarantee_value ? parseFloat(formData.guarantee_value) : null,
        status: "active",
      });

      if (error) throw error;

      // Update property status to rented
      await supabase
        .from("properties")
        .update({ status: "rented" })
        .eq("id", propertyId);

      toast({
        title: "Sucesso!",
        description: "Contrato criado com sucesso",
      });

      navigate(`/imoveis/${propertyId}`);
    } catch (error: any) {
      toast({
        title: "Erro ao criar contrato",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tenant_name">Nome Completo *</Label>
              <Input
                id="tenant_name"
                value={formData.tenant_name}
                onChange={(e) => updateFormData("tenant_name", e.target.value)}
                placeholder="Nome completo do inquilino"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenant_document">CPF/CNPJ</Label>
                <Input
                  id="tenant_document"
                  value={formData.tenant_document}
                  onChange={(e) => updateFormData("tenant_document", e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="tenant_rg">RG</Label>
                <Input
                  id="tenant_rg"
                  value={formData.tenant_rg}
                  onChange={(e) => updateFormData("tenant_rg", e.target.value)}
                  placeholder="00.000.000-0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tenant_email">Email</Label>
              <Input
                id="tenant_email"
                type="email"
                value={formData.tenant_email}
                onChange={(e) => updateFormData("tenant_email", e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenant_phone">Telefone *</Label>
                <Input
                  id="tenant_phone"
                  value={formData.tenant_phone}
                  onChange={(e) => updateFormData("tenant_phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label htmlFor="tenant_emergency_phone">Telefone de Emergência</Label>
                <Input
                  id="tenant_emergency_phone"
                  value={formData.tenant_emergency_phone}
                  onChange={(e) => updateFormData("tenant_emergency_phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tenant_profession">Profissão</Label>
              <Input
                id="tenant_profession"
                value={formData.tenant_profession}
                onChange={(e) => updateFormData("tenant_profession", e.target.value)}
                placeholder="Profissão do inquilino"
              />
            </div>

            {/* Co-tenants Section */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-3">
                <Label>Outras pessoas que vão morar no imóvel</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateFormData("co_tenants", [
                      ...formData.co_tenants,
                      { name: "", document: "", relationship: "" }
                    ]);
                  }}
                >
                  + Adicionar Pessoa
                </Button>
              </div>
              {formData.co_tenants.map((coTenant, index) => (
                <div key={index} className="grid grid-cols-3 gap-3 mb-3 p-3 border rounded-lg">
                  <Input
                    placeholder="Nome"
                    value={coTenant.name}
                    onChange={(e) => {
                      const updated = [...formData.co_tenants];
                      updated[index].name = e.target.value;
                      updateFormData("co_tenants", updated);
                    }}
                  />
                  <Input
                    placeholder="CPF"
                    value={coTenant.document}
                    onChange={(e) => {
                      const updated = [...formData.co_tenants];
                      updated[index].document = e.target.value;
                      updateFormData("co_tenants", updated);
                    }}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Parentesco"
                      value={coTenant.relationship}
                      onChange={(e) => {
                        const updated = [...formData.co_tenants];
                        updated[index].relationship = e.target.value;
                        updateFormData("co_tenants", updated);
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        updateFormData(
                          "co_tenants",
                          formData.co_tenants.filter((_, i) => i !== index)
                        );
                      }}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="contract_number">Número do Contrato</Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => updateFormData("contract_number", e.target.value)}
                placeholder="Número ou identificação do contrato"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Data de Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateFormData("start_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data de Término</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => updateFormData("end_date", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rental_value">Valor do Aluguel *</Label>
              <Input
                id="rental_value"
                type="number"
                step="0.01"
                value={formData.rental_value}
                onChange={(e) => updateFormData("rental_value", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="payment_day">Dia de Vencimento</Label>
              <Select
                value={formData.payment_day}
                onValueChange={(value) => updateFormData("payment_day", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment_method">Método de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => updateFormData("payment_method", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="debit">Débito Automático</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="adjustment_index">Índice de Reajuste</Label>
              <Select
                value={formData.adjustment_index}
                onValueChange={(value) => updateFormData("adjustment_index", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o índice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IPCA">IPCA</SelectItem>
                  <SelectItem value="IGPM">IGP-M</SelectItem>
                  <SelectItem value="INPC">INPC</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pre_paid"
                checked={formData.pre_paid}
                onChange={(e) => updateFormData("pre_paid", e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="pre_paid" className="cursor-pointer">
                Cobrança Pré-Paga
              </Label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="guarantee_type">Tipo de Garantia</Label>
              <Select
                value={formData.guarantee_type}
                onValueChange={(value) => updateFormData("guarantee_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de garantia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Caução em Dinheiro</SelectItem>
                  <SelectItem value="guarantor">Fiador</SelectItem>
                  <SelectItem value="insurance">Seguro Fiança</SelectItem>
                  <SelectItem value="none">Sem Garantia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.guarantee_type && formData.guarantee_type !== "none" && (
              <div>
                <Label htmlFor="guarantee_value">Valor da Garantia</Label>
                <Input
                  id="guarantee_value"
                  type="number"
                  step="0.01"
                  value={formData.guarantee_value}
                  onChange={(e) => updateFormData("guarantee_value", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}
            <div className="rounded-lg bg-muted p-4 mt-6">
              <h4 className="font-semibold mb-2">Informação</h4>
              <p className="text-sm text-muted-foreground">
                A garantia é opcional mas recomendada para proteger o proprietário contra
                inadimplência e danos ao imóvel.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Inquilino
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Nome:</dt>
                  <dd className="font-medium">{formData.tenant_name}</dd>
                </div>
                {formData.tenant_document && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">CPF/CNPJ:</dt>
                    <dd className="font-medium">{formData.tenant_document}</dd>
                  </div>
                )}
                {formData.tenant_rg && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">RG:</dt>
                    <dd className="font-medium">{formData.tenant_rg}</dd>
                  </div>
                )}
                {formData.tenant_profession && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Profissão:</dt>
                    <dd className="font-medium">{formData.tenant_profession}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Telefone:</dt>
                  <dd className="font-medium">{formData.tenant_phone}</dd>
                </div>
                {formData.tenant_emergency_phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Telefone de Emergência:</dt>
                    <dd className="font-medium">{formData.tenant_emergency_phone}</dd>
                  </div>
                )}
                {formData.tenant_email && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email:</dt>
                    <dd className="font-medium">{formData.tenant_email}</dd>
                  </div>
                )}
                {formData.co_tenants.length > 0 && (
                  <div className="pt-2 border-t">
                    <dt className="text-muted-foreground font-semibold mb-2">Outras pessoas no imóvel:</dt>
                    {formData.co_tenants.map((coTenant, index) => (
                      <dd key={index} className="ml-4 mb-1">
                        {coTenant.name} {coTenant.relationship && `(${coTenant.relationship})`}
                      </dd>
                    ))}
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Dados do Contrato
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Imóvel:</dt>
                  <dd className="font-medium">{property?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Início:</dt>
                  <dd className="font-medium">
                    {new Date(formData.start_date).toLocaleDateString("pt-BR")}
                  </dd>
                </div>
                {formData.end_date && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Término:</dt>
                    <dd className="font-medium">
                      {new Date(formData.end_date).toLocaleDateString("pt-BR")}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Valor do Aluguel:</dt>
                  <dd className="font-medium text-lg text-green-600">
                    R$ {parseFloat(formData.rental_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vencimento:</dt>
                  <dd className="font-medium">Dia {formData.payment_day}</dd>
                </div>
              </dl>
            </div>

            {formData.guarantee_type && formData.guarantee_type !== "none" && (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Garantia
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tipo:</dt>
                    <dd className="font-medium capitalize">{formData.guarantee_type}</dd>
                  </div>
                  {formData.guarantee_value && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Valor:</dt>
                      <dd className="font-medium">
                        R$ {parseFloat(formData.guarantee_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout title="Novo Contrato">
      <div className="max-w-4xl mx-auto">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;

                  return (
                    <div key={step.number} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`
                            rounded-full w-12 h-12 flex items-center justify-center transition-all
                            ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                            ${isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : ""}
                            ${!isActive && !isCompleted ? "bg-muted text-muted-foreground" : ""}
                          `}
                        >
                          {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                        </div>
                        <span
                          className={`
                            mt-2 text-xs font-medium text-center
                            ${isActive || isCompleted ? "text-primary" : "text-muted-foreground"}
                          `}
                        >
                          {step.title}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`
                            h-1 flex-1 mx-2 mt-[-24px] transition-all
                            ${currentStep > step.number ? "bg-primary" : "bg-muted"}
                          `}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {steps[currentStep - 1].icon && (() => {
                    const Icon = steps[currentStep - 1].icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {steps[currentStep - 1].title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderStepContent()}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>

                  {currentStep < 4 ? (
                    <Button onClick={handleNext}>
                      Próximo
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? "Criando..." : "Criar Contrato"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
      </div>
    </AppLayout>
  );
};

export default ContractWizard;
