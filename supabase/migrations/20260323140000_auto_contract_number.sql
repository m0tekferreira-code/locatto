-- ============================================================
-- Auto-generate contract_number on INSERT
-- Uses the highest purely numeric number already in the account
-- and increments by 1. If the user provides a number, it's kept.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_num integer;
BEGIN
  -- Se o usuário forneceu um número, mantém
  IF NEW.contract_number IS NOT NULL AND trim(NEW.contract_number) != '' THEN
    RETURN NEW;
  END IF;

  -- Busca o maior número puramente numérico já cadastrado para esta conta
  SELECT COALESCE(
    MAX(contract_number::integer), 0
  )
  INTO v_max_num
  FROM public.contracts
  WHERE account_id = NEW.account_id
    AND contract_number ~ '^\d+$';

  NEW.contract_number := (v_max_num + 1)::text;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contracts_auto_number_trigger ON public.contracts;
CREATE TRIGGER contracts_auto_number_trigger
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.auto_contract_number();
