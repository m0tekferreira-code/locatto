
-- Table to store manual name-to-contract mappings for bank reconciliation
CREATE TABLE public.extrato_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  nome_extrato text NOT NULL,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id, nome_extrato)
);

ALTER TABLE public.extrato_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view aliases"
  ON public.extrato_aliases FOR SELECT TO authenticated
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert aliases"
  ON public.extrato_aliases FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can update aliases"
  ON public.extrato_aliases FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete aliases"
  ON public.extrato_aliases FOR DELETE TO authenticated
  USING (account_id = get_user_account_id(auth.uid()));
