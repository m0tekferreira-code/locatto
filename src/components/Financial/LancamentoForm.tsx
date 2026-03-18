import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LancamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  lancamento?: any;
}

const categorias = {
  receita: ['Aluguel', 'Condomínio', 'Multa', 'Outros'],
  despesa: [
    'Condomínio',
    'Manutenção', 
    'Reforma',
    'Limpeza',
    'Segurança',
    'IPTU',
    'Água', 
    'Luz', 
    'Gás',
    'Internet/TV',
    'Dedetização',
    'Jardinagem',
    'Elevador',
    'Comissão',
    'Outros'
  ],
};

export function LancamentoForm({ open, onOpenChange, onSuccess, lancamento }: LancamentoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(lancamento?.tipo || 'receita');
  const [isCondomonioExpense, setIsCondomonioExpense] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: lancamento || {
      tipo: 'receita',
      categoria: '',
      descricao: '',
      valor: '',
      data_vencimento: '',
      id_imovel: '',
      id_contrato: '',
    },
  });

  // Buscar imóveis do usuário
  const { data: properties } = useQuery({
    queryKey: ['properties-lancamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar contratos do usuário
  const { data: contracts } = useQuery({
    queryKey: ['contracts-lancamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, property_id, tenant_name, properties(name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (formData: any) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const lancamentoData = {
        ...formData,
        user_id: user.id,
        tipo,
        valor: parseFloat(formData.valor),
        id_imovel: formData.id_imovel || null,
        id_contrato: formData.id_contrato || null,
        status: 'pendente',
      };

      if (lancamento?.id) {
        // Atualizar
        const { error } = await supabase
          .from('lancamentos_financeiros')
          .update(lancamentoData)
          .eq('id', lancamento.id);

        if (error) throw error;
        toast.success('Lançamento atualizado com sucesso!');
      } else {
        // Criar
        const { error } = await supabase
          .from('lancamentos_financeiros')
          .insert(lancamentoData);

        if (error) throw error;
        toast.success('Lançamento criado com sucesso!');
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      toast.error(error.message || 'Erro ao salvar lançamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {lancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
          <DialogDescription>
            Adicione receitas ou despesas relacionadas aos imóveis
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={tipo}
                onValueChange={(value: 'receita' | 'despesa') => {
                  setTipo(value);
                  setValue('tipo', value);
                  setValue('categoria', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select onValueChange={(value) => setValue('categoria', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias[tipo].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              {...register('descricao', { required: true })}
              placeholder="Descreva o lançamento"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                {...register('valor', { required: true, min: 0 })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
              <Input
                id="data_vencimento"
                type="date"
                {...register('data_vencimento', { required: true })}
              />
            </div>
          </div>

          {tipo === 'despesa' && (
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                id="condominio-expense"
                checked={isCondomonioExpense}
                onCheckedChange={(checked) => {
                  setIsCondomonioExpense(checked as boolean);
                  if (checked) {
                    setValue('id_imovel', '');
                  }
                }}
              />
              <label
                htmlFor="condominio-expense"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Despesa comum do condomínio
              </label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="id_imovel">
              Imóvel {isCondomonioExpense && tipo === 'despesa' && '(opcional)'}
            </Label>
            <Select 
              onValueChange={(value) => setValue('id_imovel', value)}
              disabled={isCondomonioExpense && tipo === 'despesa'}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isCondomonioExpense && tipo === 'despesa' 
                    ? "Condomínio - Áreas Comuns" 
                    : "Selecione um imóvel (opcional)"
                } />
              </SelectTrigger>
              <SelectContent>
                {properties?.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCondomonioExpense && tipo === 'despesa' && (
              <p className="text-xs text-muted-foreground">
                Despesa aplicada às áreas comuns do condomínio
              </p>
            )}
          </div>

          {tipo === 'receita' && (
            <div className="space-y-2">
              <Label htmlFor="id_contrato">Contrato</Label>
              <Select onValueChange={(value) => setValue('id_contrato', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contrato (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {contracts?.map((contract: any) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.properties?.name} - {contract.tenant_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}