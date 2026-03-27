import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronLeft, ChevronRight, DollarSign, FileCheck, Plus, Shield, Trash2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { parseLocalDate } from "@/lib/utils";

const ContractWizard = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const STORAGE_KEY = `contract_wizard_${accountId ?? "anon"}_${propertyId ?? "new"}`;

  const defaultFormData = {
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
    selected_property_id: propertyId ?? "",
    contract_number: "",
    start_date: "",
    end_date: "",
    rental_value: "",
    payment_day: "5",
    payment_method: "bank_transfer",
    adjustment_index: "",
    pre_paid: false,
    
    // Step 3: Cobranças padrão (defaults das faturas)
    condo_fee: "",
    water_amount: "",
    electricity_amount: "",
    gas_amount: "",
    internet_amount: "",
    cleaning_fee: "",
    // Cobranças extras
    extra_charges: [] as Array<{
      id: string;
      description: string;
      charge_type: string;
      value_per_installment: string;
      installments: string;
      charge_until_end: boolean;
      start_date: string;
    }>,

    // Step 4: Guarantee
    guarantee_type: "",
    guarantee_value: "",
    guarantee_installments: "1",
  };

  // Restore saved form data from localStorage on mount
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultFormData, ...JSON.parse(saved) };
    } catch {
      // ignore parse errors
    }
    return defaultFormData;
  });

  // Persist form data to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch {
      // ignore storage errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Busca os imóveis disponíveis da conta (não alugados)
  const { data: availableProperties } = useQuery({
    queryKey: ["available-properties", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, status")
        .eq("account_id", accountId!)
        .in("status", ["disponivel", "available"])
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!accountId && !propertyId,
  });

  // Busca o próximo número de contrato disponível para a conta
  const { data: nextContractNumber } = useQuery({
    queryKey: ["next-contract-number", accountId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("contract_number")
        .eq("account_id", accountId!)
        .not("contract_number", "is", null);

      if (!data || data.length === 0) return "1";

      const max = data.reduce((acc, c) => {
        const num = parseInt(c.contract_number ?? "0", 10);
        return isNaN(num) ? acc : Math.max(acc, num);
      }, 0);

      return (max + 1).toString();
    },
    enabled: !!accountId,
  });

  // Pré-preenche o número quando o próximo número é carregado e o campo ainda está vazio
  useEffect(() => {
    if (nextContractNumber && formData.contract_number === "") {
      updateFormData("contract_number", nextContractNumber);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextContractNumber]);

  const { data: property } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const steps = [
    { number: 1, title: "Dados do Inquilino", icon: User },
    { number: 2, title: "Dados do Contrato", icon: FileCheck },
    { number: 3, title: "Cobranças", icon: DollarSign },
    { number: 4, title: "Garantia", icon: Shield },
    { number: 5, title: "Revisão", icon: Check },
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

    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const resolvedPropertyId = formData.selected_property_id || propertyId || null;
    setIsSubmitting(true);
    try {
      // 1) Cria o contrato
      const { data: newContract, error } = await supabase.from("contracts").insert({
        user_id: user?.id,
        account_id: accountId,
        property_id: resolvedPropertyId,
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
        condo_fee: formData.condo_fee ? parseFloat(formData.condo_fee) : null,
        water_amount: formData.water_amount ? parseFloat(formData.water_amount) : null,
        electricity_amount: formData.electricity_amount ? parseFloat(formData.electricity_amount) : null,
        gas_amount: formData.gas_amount ? parseFloat(formData.gas_amount) : null,
        internet_amount: formData.internet_amount ? parseFloat(formData.internet_amount) : null,
        cleaning_fee: formData.cleaning_fee ? parseFloat(formData.cleaning_fee) : null,
        extra_charges: formData.extra_charges.length > 0
          ? formData.extra_charges.map(c => ({
              id: c.id,
              description: c.description,
              charge_type: c.charge_type,
              value_per_installment: parseFloat(c.value_per_installment) || 0,
              installments: c.charge_until_end ? null : (parseInt(c.installments) || null),
              charge_until_end: c.charge_until_end,
              start_date: c.start_date || formData.start_date,
              status: "active",
            }))
          : null,
        guarantee_type: formData.guarantee_type || null,
        guarantee_value: formData.guarantee_value ? parseFloat(formData.guarantee_value) : null,
        guarantee_installments: formData.guarantee_value && formData.guarantee_type && formData.guarantee_type !== "none" ? (parseInt(formData.guarantee_installments) || 1) : null,
        status: "active",
      }).select("id").single();

      if (error) throw error;

      // 2) Cria contato principal (inquilino) vinculado ao contrato e ao imóvel
      if (newContract?.id) {
        // Verifica se já existe contato com mesmo CPF ou email na conta
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("account_id", accountId!)
          .or(
            [
              formData.tenant_document ? `document.eq.${formData.tenant_document}` : null,
              formData.tenant_email ? `email.eq.${formData.tenant_email}` : null,
            ]
              .filter(Boolean)
              .join(",") || "id.is.null"
          )
          .maybeSingle();

        if (!existing) {
          await supabase.from("contacts").insert({
            user_id: user?.id,
            account_id: accountId,
            name: formData.tenant_name,
            document: formData.tenant_document || null,
            email: formData.tenant_email || null,
            phone: formData.tenant_phone || null,
            contact_type: "tenant",
            status: "active",
            notes: [
              formData.tenant_profession ? `Profissão: ${formData.tenant_profession}` : null,
              formData.tenant_rg ? `RG: ${formData.tenant_rg}` : null,
              formData.tenant_emergency_phone ? `Tel. emergência: ${formData.tenant_emergency_phone}` : null,
              resolvedPropertyId ? `Imóvel vinculado: ${resolvedPropertyId}` : null,
              `Contrato: ${newContract.id}`,
            ].filter(Boolean).join(" | ") || null,
          });
        }

        // 3) Cria contatos para os co-inquilinos
        for (const co of formData.co_tenants) {
          if (!co.name) continue;
          await supabase.from("contacts").insert({
            user_id: user?.id,
            account_id: accountId,
            name: co.name,
            document: co.document || null,
            contact_type: "tenant",
            status: "active",
            notes: [
              co.relationship ? `Parentesco: ${co.relationship}` : null,
              `Contrato: ${newContract.id}`,
            ].filter(Boolean).join(" | ") || null,
          });
        }
      }

      // Marca o imóvel como alugado
      if (resolvedPropertyId) {
        await supabase
          .from("properties")
          .update({ status: "rented" })
          .eq("id", resolvedPropertyId);
      }

      toast({
        title: "Sucesso!",
        description: "Contrato criado com sucesso",
      });

      localStorage.removeItem(STORAGE_KEY);
      navigate(resolvedPropertyId ? `/imoveis/${resolvedPropertyId}` : "/contratos");
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
            {/* Seletor de imóvel — exibido apenas quando veio de /contratos/novo sem propertyId */}
            {!propertyId && (
              <div>
                <Label htmlFor="selected_property_id" className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  Imóvel *
                </Label>
                <Select
                  value={formData.selected_property_id}
                  onValueChange={(value) => updateFormData("selected_property_id", value)}
                >
                  <SelectTrigger id="selected_property_id">
                    <SelectValue placeholder="Selecione o imóvel" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProperties && availableProperties.length > 0 ? (
                      availableProperties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.address ? ` — ${p.address}` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Nenhum imóvel disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Imóvel fixo vindo da URL */}
            {propertyId && property && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Imóvel</p>
                  <p className="font-medium">{property.name}</p>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="contract_number">Número do Contrato</Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => updateFormData("contract_number", e.target.value)}
                placeholder={nextContractNumber ? `Próximo disponível: ${nextContractNumber}` : "Gerado automaticamente"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Preenchido automaticamente. Você pode alterá-lo se necessário.
              </p>
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
              <Checkbox
                id="pre_paid"
                checked={formData.pre_paid}
                onCheckedChange={(checked) => updateFormData("pre_paid", !!checked)}
              />
              <Label htmlFor="pre_paid" className="cursor-pointer">
                Cobrança Pré-Paga
              </Label>
            </div>
          </div>
        );

      case 3: {
        const chargeTypeLabels: Record<string, string> = {
          condo_fee: "Condomínio",
          iptu: "IPTU",
          insurance: "Seguro",
          water: "Água",
          electricity: "Luz",
          gas: "Gás",
          internet: "Internet",
          other: "Outros",
        };
        return (
          <div className="space-y-6">
            {/* Cobranças fixas padrão */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Cobranças Fixas Mensais</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Preencha os valores que serão pré-carregados ao gerar faturas deste contrato. Deixe em branco se não se aplica.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="condo_fee">Condomínio (R$)</Label>
                  <Input
                    id="condo_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.condo_fee}
                    onChange={(e) => updateFormData("condo_fee", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="water_amount">Água (R$)</Label>
                  <Input
                    id="water_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.water_amount}
                    onChange={(e) => updateFormData("water_amount", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="electricity_amount">Luz (R$)</Label>
                  <Input
                    id="electricity_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.electricity_amount}
                    onChange={(e) => updateFormData("electricity_amount", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="gas_amount">Gás (R$)</Label>
                  <Input
                    id="gas_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.gas_amount}
                    onChange={(e) => updateFormData("gas_amount", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="internet_amount">Internet (R$)</Label>
                  <Input
                    id="internet_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.internet_amount}
                    onChange={(e) => updateFormData("internet_amount", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="cleaning_fee">Estacionamento (R$)</Label>
                  <Input
                    id="cleaning_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cleaning_fee}
                    onChange={(e) => updateFormData("cleaning_fee", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            {/* Cobranças extras personalizadas */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="font-semibold text-sm">Cobranças Extras</h4>
                  <p className="text-xs text-muted-foreground">
                    Adicione cobranças adicionais por prazo determinado ou até o fim do contrato.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateFormData("extra_charges", [
                      ...formData.extra_charges,
                      {
                        id: crypto.randomUUID(),
                        description: "",
                        charge_type: "other",
                        value_per_installment: "",
                        installments: "",
                        charge_until_end: true,
                        start_date: formData.start_date || "",
                      },
                    ])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {formData.extra_charges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
                  Nenhuma cobrança extra adicionada.
                </p>
              )}

              <div className="space-y-3">
                {formData.extra_charges.map((charge, index) => (
                  <div key={charge.id} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Cobrança #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() =>
                          updateFormData(
                            "extra_charges",
                            formData.extra_charges.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Descrição</Label>
                        <Input
                          placeholder="Ex: IPTU, Seguro incêndio..."
                          value={charge.description}
                          onChange={(e) => {
                            const updated = [...formData.extra_charges];
                            updated[index] = { ...updated[index], description: e.target.value };
                            updateFormData("extra_charges", updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={charge.charge_type}
                          onValueChange={(value) => {
                            const updated = [...formData.extra_charges];
                            updated[index] = { ...updated[index], charge_type: value };
                            updateFormData("extra_charges", updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(chargeTypeLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={charge.value_per_installment}
                          onChange={(e) => {
                            const updated = [...formData.extra_charges];
                            updated[index] = { ...updated[index], value_per_installment: e.target.value };
                            updateFormData("extra_charges", updated);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`charge_until_end_${index}`}
                          checked={charge.charge_until_end}
                          onCheckedChange={(checked) => {
                            const updated = [...formData.extra_charges];
                            updated[index] = { ...updated[index], charge_until_end: !!checked };
                            updateFormData("extra_charges", updated);
                          }}
                        />
                        <Label htmlFor={`charge_until_end_${index}`} className="cursor-pointer text-sm">
                          Cobrar até o fim do contrato
                        </Label>
                      </div>
                    </div>

                    {!charge.charge_until_end && (
                      <div className="w-1/2">
                        <Label>Nº de Parcelas</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Ex: 12"
                          value={charge.installments}
                          onChange={(e) => {
                            const updated = [...formData.extra_charges];
                            updated[index] = { ...updated[index], installments: e.target.value };
                            updateFormData("extra_charges", updated);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 4:
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
            {formData.guarantee_type && formData.guarantee_type !== "none" && formData.guarantee_value && (
              <div>
                <Label htmlFor="guarantee_installments">Cobrar em quantas parcelas?</Label>
                <Select
                  value={formData.guarantee_installments}
                  onValueChange={(value) => updateFormData("guarantee_installments", value)}
                >
                  <SelectTrigger id="guarantee_installments">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x {formData.guarantee_value ? `(R$ ${(parseFloat(formData.guarantee_value) / n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / parcela)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      case 5:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Inquilino
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-medium">{formData.tenant_name}</span>
                </div>
                {formData.tenant_document && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPF/CNPJ:</span>
                    <span className="font-medium">{formData.tenant_document}</span>
                  </div>
                )}
                {formData.tenant_rg && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RG:</span>
                    <span className="font-medium">{formData.tenant_rg}</span>
                  </div>
                )}
                {formData.tenant_profession && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profissão:</span>
                    <span className="font-medium">{formData.tenant_profession}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefone:</span>
                  <span className="font-medium">{formData.tenant_phone}</span>
                </div>
                {formData.tenant_emergency_phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone de Emergência:</span>
                    <span className="font-medium">{formData.tenant_emergency_phone}</span>
                  </div>
                )}
                {formData.tenant_email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{formData.tenant_email}</span>
                  </div>
                )}
                {formData.co_tenants.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground font-semibold block mb-2">Outras pessoas no imóvel:</span>
                    {formData.co_tenants.map((coTenant, index) => (
                      <span key={index} className="ml-4 mb-1 block">
                        {coTenant.name} {coTenant.relationship && `(${coTenant.relationship})`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Dados do Contrato
              </h3>
              <div className="space-y-2 text-sm">
                {(() => {
                  const selectedProp = propertyId
                    ? property
                    : availableProperties?.find((p) => p.id === formData.selected_property_id);
                  return selectedProp ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Imóvel:</span>
                      <span className="font-medium">{selectedProp.name}</span>
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Início:</span>
                  <span className="font-medium">
                    {parseLocalDate(formData.start_date).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {formData.end_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Término:</span>
                    <span className="font-medium">
                      {parseLocalDate(formData.end_date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor do Aluguel:</span>
                  <span className="font-medium text-lg text-green-600">
                    R$ {parseFloat(formData.rental_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento:</span>
                  <span className="font-medium">Dia {formData.payment_day}</span>
                </div>
              </div>
            </div>

            {formData.guarantee_type && formData.guarantee_type !== "none" && (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Garantia
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium capitalize">{formData.guarantee_type}</span>
                  </div>
                  {formData.guarantee_value && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium">
                        R$ {parseFloat(formData.guarantee_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {formData.guarantee_value && parseInt(formData.guarantee_installments) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parcelas:</span>
                      <span className="font-medium">
                        {formData.guarantee_installments}x de R$ {(parseFloat(formData.guarantee_value) / parseInt(formData.guarantee_installments)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cobranças na revisão */}
            {(formData.condo_fee || formData.water_amount || formData.electricity_amount ||
              formData.gas_amount || formData.internet_amount || formData.cleaning_fee ||
              formData.extra_charges.length > 0) && (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cobranças
                </h3>
                <div className="space-y-2 text-sm">
                  {formData.condo_fee && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condomínio:</span>
                      <span>R$ {parseFloat(formData.condo_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {formData.water_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Água:</span>
                      <span>R$ {parseFloat(formData.water_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {formData.electricity_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Luz:</span>
                      <span>R$ {parseFloat(formData.electricity_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {formData.gas_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gás:</span>
                      <span>R$ {parseFloat(formData.gas_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {formData.internet_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Internet:</span>
                      <span>R$ {parseFloat(formData.internet_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {formData.cleaning_fee && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Limpeza:</span>
                      <span>R$ {parseFloat(formData.cleaning_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {formData.extra_charges.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground font-semibold block mb-1">Cobranças extras:</span>
                      {formData.extra_charges.map((c, i) => (
                        <div key={i} className="flex justify-between ml-2">
                          <span className="text-muted-foreground">{c.description || `Cobrança #${i + 1}`}:</span>
                          <span>
                            R$ {parseFloat(c.value_per_installment || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            {c.charge_until_end ? " (até o fim)" : ` x ${c.installments}x`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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

                  {currentStep < 5 ? (
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
