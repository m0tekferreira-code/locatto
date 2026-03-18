-- Criar ENUM para tipo de lançamento
CREATE TYPE lancamento_tipo AS ENUM ('receita', 'despesa');

-- Criar ENUM para status de lançamento
CREATE TYPE lancamento_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');

-- Criar tabela de lançamentos financeiros
CREATE TABLE public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  id_imovel UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  id_contrato UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  tipo lancamento_tipo NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status lancamento_status NOT NULL DEFAULT 'pendente',
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  descricao TEXT,
  categoria TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_lancamentos_user_id ON public.lancamentos_financeiros(user_id);
CREATE INDEX idx_lancamentos_imovel ON public.lancamentos_financeiros(id_imovel);
CREATE INDEX idx_lancamentos_contrato ON public.lancamentos_financeiros(id_contrato);
CREATE INDEX idx_lancamentos_data_vencimento ON public.lancamentos_financeiros(data_vencimento);
CREATE INDEX idx_lancamentos_data_pagamento ON public.lancamentos_financeiros(data_pagamento);
CREATE INDEX idx_lancamentos_status ON public.lancamentos_financeiros(status);
CREATE INDEX idx_lancamentos_tipo ON public.lancamentos_financeiros(tipo);

-- Habilitar RLS
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Users can view their own lancamentos"
  ON public.lancamentos_financeiros
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lancamentos"
  ON public.lancamentos_financeiros
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lancamentos"
  ON public.lancamentos_financeiros
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lancamentos"
  ON public.lancamentos_financeiros
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lancamentos_financeiros_updated_at
  BEFORE UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar status automaticamente
CREATE OR REPLACE FUNCTION public.update_lancamento_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se foi pago, muda para 'pago'
  IF NEW.data_pagamento IS NOT NULL AND NEW.status = 'pendente' THEN
    NEW.status := 'pago';
  END IF;
  
  -- Se não foi pago e está vencido, muda para 'atrasado'
  IF NEW.data_pagamento IS NULL 
     AND NEW.status = 'pendente' 
     AND NEW.data_vencimento < CURRENT_DATE THEN
    NEW.status := 'atrasado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_lancamento_status
  BEFORE INSERT OR UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lancamento_status();

-- Função para calcular resumo financeiro
CREATE OR REPLACE FUNCTION public.get_resumo_financeiro(
  p_user_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE(
  total_receitas DECIMAL,
  total_despesas DECIMAL,
  saldo DECIMAL,
  total_inadimplencia DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total de receitas pagas no período
    COALESCE(SUM(CASE 
      WHEN tipo = 'receita' 
        AND status = 'pago' 
        AND data_pagamento BETWEEN p_data_inicio AND p_data_fim 
      THEN valor 
      ELSE 0 
    END), 0) AS total_receitas,
    
    -- Total de despesas pagas no período
    COALESCE(SUM(CASE 
      WHEN tipo = 'despesa' 
        AND status = 'pago' 
        AND data_pagamento BETWEEN p_data_inicio AND p_data_fim 
      THEN valor 
      ELSE 0 
    END), 0) AS total_despesas,
    
    -- Saldo (receitas - despesas)
    COALESCE(SUM(CASE 
      WHEN tipo = 'receita' 
        AND status = 'pago' 
        AND data_pagamento BETWEEN p_data_inicio AND p_data_fim 
      THEN valor 
      ELSE 0 
    END), 0) - COALESCE(SUM(CASE 
      WHEN tipo = 'despesa' 
        AND status = 'pago' 
        AND data_pagamento BETWEEN p_data_inicio AND p_data_fim 
      THEN valor 
      ELSE 0 
    END), 0) AS saldo,
    
    -- Total de inadimplência (todos os atrasados, sem filtro de data)
    COALESCE(SUM(CASE 
      WHEN status = 'atrasado' 
      THEN valor 
      ELSE 0 
    END), 0) AS total_inadimplencia
    
  FROM public.lancamentos_financeiros
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;