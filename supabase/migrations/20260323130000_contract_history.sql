-- ============================================================
-- Contract History / Audit Log
-- Records every meaningful event on a contract automatically.
-- ============================================================

-- 1) Table -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_history (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  account_id   uuid        REFERENCES public.accounts(id) ON DELETE SET NULL,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type   text        NOT NULL,
  description  text        NOT NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id
  ON public.contract_history(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_history_created_at
  ON public.contract_history(created_at DESC);

-- 2) RLS ---------------------------------------------------------
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.contract_history TO authenticated;

CREATE POLICY contract_history_select
  ON public.contract_history FOR SELECT TO authenticated
  USING (public.is_account_member(account_id));

CREATE POLICY contract_history_insert
  ON public.contract_history FOR INSERT TO authenticated
  WITH CHECK (public.is_account_member(account_id));

-- Super admins can see all history
CREATE POLICY contract_history_super_admin
  ON public.contract_history FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 3) Trigger: contracts table ------------------------------------
CREATE OR REPLACE FUNCTION public.log_contract_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type  text;
  v_description text;
  v_metadata    jsonb := '{}';
  v_account_id  uuid;
  v_changes     jsonb := '{}';
BEGIN
  v_account_id := COALESCE(NEW.account_id, OLD.account_id);

  IF TG_OP = 'INSERT' THEN
    v_event_type  := 'contract_created';
    v_description := 'Contrato criado';
    v_metadata := jsonb_build_object(
      'tenant_name',   NEW.tenant_name,
      'rental_value',  NEW.rental_value,
      'start_date',    NEW.start_date,
      'status',        NEW.status
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Build diff of meaningful fields
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object(
        'status', jsonb_build_object('de', OLD.status, 'para', NEW.status));
    END IF;
    IF OLD.rental_value IS DISTINCT FROM NEW.rental_value THEN
      v_changes := v_changes || jsonb_build_object(
        'rental_value', jsonb_build_object('de', OLD.rental_value, 'para', NEW.rental_value));
    END IF;
    IF OLD.end_date IS DISTINCT FROM NEW.end_date THEN
      v_changes := v_changes || jsonb_build_object(
        'end_date', jsonb_build_object('de', OLD.end_date, 'para', NEW.end_date));
    END IF;
    IF OLD.payment_day IS DISTINCT FROM NEW.payment_day THEN
      v_changes := v_changes || jsonb_build_object(
        'payment_day', jsonb_build_object('de', OLD.payment_day, 'para', NEW.payment_day));
    END IF;
    IF OLD.adjustment_index IS DISTINCT FROM NEW.adjustment_index THEN
      v_changes := v_changes || jsonb_build_object(
        'adjustment_index', jsonb_build_object('de', OLD.adjustment_index, 'para', NEW.adjustment_index));
    END IF;
    IF OLD.guarantee_type IS DISTINCT FROM NEW.guarantee_type THEN
      v_changes := v_changes || jsonb_build_object(
        'guarantee_type', jsonb_build_object('de', OLD.guarantee_type, 'para', NEW.guarantee_type));
    END IF;

    -- Skip no-op updates
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

    -- Choose a descriptive event type based on most prominent change
    IF v_changes ? 'status' THEN
      v_event_type  := 'contract_status_changed';
      v_description := 'Status alterado de "'
        || COALESCE(OLD.status, '') || '" para "'
        || COALESCE(NEW.status, '') || '"';
    ELSIF v_changes ? 'rental_value' THEN
      v_event_type  := 'contract_value_changed';
      v_description := 'Valor do aluguel alterado de R$ '
        || OLD.rental_value::text || ' para R$ ' || NEW.rental_value::text;
    ELSIF v_changes ? 'end_date' THEN
      v_event_type  := 'contract_date_changed';
      v_description := 'Data de término do contrato alterada';
    ELSE
      v_event_type  := 'contract_updated';
      v_description := 'Contrato atualizado';
    END IF;

    v_metadata := v_changes;
  END IF;

  INSERT INTO public.contract_history
    (contract_id, account_id, user_id, event_type, description, metadata)
  VALUES
    (COALESCE(NEW.id, OLD.id), v_account_id, auth.uid(),
     v_event_type, v_description, v_metadata);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contracts_history_trigger ON public.contracts;
CREATE TRIGGER contracts_history_trigger
  AFTER INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_contract_change();

-- 4) Trigger: invoices table ------------------------------------
CREATE OR REPLACE FUNCTION public.log_invoice_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type  text;
  v_description text;
  v_metadata    jsonb := '{}';
  v_contract_id uuid;
  v_account_id  uuid;
BEGIN
  v_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  v_account_id  := COALESCE(NEW.account_id, OLD.account_id);

  -- Only log if tied to a contract
  IF v_contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_event_type  := 'invoice_generated';
    v_description := 'Fatura gerada · vencimento '
      || to_char(NEW.due_date::date, 'DD/MM/YYYY')
      || ' · R$ ' || NEW.total_amount::text;
    v_metadata := jsonb_build_object(
      'invoice_id',       NEW.id,
      'due_date',         NEW.due_date,
      'total_amount',     NEW.total_amount,
      'reference_month',  NEW.reference_month,
      'status',           NEW.status
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'paid' THEN
        v_event_type  := 'invoice_paid';
        v_description := 'Fatura paga · vencimento '
          || to_char(NEW.due_date::date, 'DD/MM/YYYY')
          || ' · R$ ' || NEW.total_amount::text;
      WHEN 'overdue' THEN
        v_event_type  := 'invoice_overdue';
        v_description := 'Fatura em atraso · R$ ' || NEW.total_amount::text;
      WHEN 'cancelled' THEN
        v_event_type  := 'invoice_cancelled';
        v_description := 'Fatura cancelada · R$ ' || NEW.total_amount::text;
      ELSE
        v_event_type  := 'invoice_status_changed';
        v_description := 'Status da fatura alterado para "' || NEW.status || '"';
    END CASE;
    v_metadata := jsonb_build_object(
      'invoice_id',    NEW.id,
      'due_date',      NEW.due_date,
      'total_amount',  NEW.total_amount,
      'old_status',    OLD.status,
      'new_status',    NEW.status
    );
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.contract_history
    (contract_id, account_id, user_id, event_type, description, metadata)
  VALUES
    (v_contract_id, v_account_id, auth.uid(),
     v_event_type, v_description, v_metadata);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_history_trigger ON public.invoices;
CREATE TRIGGER invoices_history_trigger
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_invoice_event();
