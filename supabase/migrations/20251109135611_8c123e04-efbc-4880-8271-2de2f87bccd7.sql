-- Remover trigger primeiro, depois função, e recriar com search_path
DROP TRIGGER IF EXISTS check_lancamento_status ON public.lancamentos_financeiros;
DROP FUNCTION IF EXISTS public.update_lancamento_status();

-- Recriar função com search_path seguro
CREATE OR REPLACE FUNCTION public.update_lancamento_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recriar trigger
CREATE TRIGGER check_lancamento_status
  BEFORE INSERT OR UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lancamento_status();