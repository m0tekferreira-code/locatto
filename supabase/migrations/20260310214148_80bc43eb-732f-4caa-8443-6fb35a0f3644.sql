
-- Etapa 1: Coluna invoice_id em lancamentos_financeiros
ALTER TABLE public.lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_invoice_id
  ON public.lancamentos_financeiros(invoice_id)
  WHERE invoice_id IS NOT NULL;

-- Etapa 2: Trigger sync invoice → lancamento
CREATE OR REPLACE FUNCTION public.sync_invoice_to_lancamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'paid' THEN
    UPDATE public.lancamentos_financeiros
    SET
      status = 'pago',
      data_pagamento = COALESCE(NEW.payment_date, CURRENT_DATE),
      updated_at = now()
    WHERE invoice_id = NEW.id
      AND status != 'pago';

  ELSIF NEW.status = 'cancelled' THEN
    UPDATE public.lancamentos_financeiros
    SET
      status = 'cancelado',
      updated_at = now()
    WHERE invoice_id = NEW.id
      AND status NOT IN ('pago', 'cancelado');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_invoice_to_lancamento
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_to_lancamento();

-- Etapa 3: Trigger de status automático em invoices
CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_date IS NOT NULL AND (OLD IS NULL OR OLD.payment_date IS NULL) THEN
    NEW.status := 'paid';
  END IF;

  IF NEW.payment_date IS NULL
     AND NEW.status = 'pending'
     AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_invoice_status
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_status();
