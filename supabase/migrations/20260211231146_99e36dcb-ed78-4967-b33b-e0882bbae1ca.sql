
-- Fase 1.1: Campos de controle de publicação em properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS publish_to_portals BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS portal_listing_id TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS portal_last_sync TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS portal_status TEXT DEFAULT 'draft';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'rent';

-- Fase 1.2: Tabela de configuração de portais por conta
CREATE TABLE IF NOT EXISTS public.portal_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) NOT NULL,
  provider TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ad_limit INTEGER DEFAULT 0,
  featured_limit INTEGER DEFAULT 0,
  credentials JSONB DEFAULT '{}'::jsonb,
  feed_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fase 1.3: Tabela de logs de sincronização
CREATE TABLE IF NOT EXISTS public.portal_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id),
  property_id UUID REFERENCES public.properties(id),
  portal TEXT,
  action TEXT,
  status TEXT,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para portal_integrations
ALTER TABLE public.portal_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view portal integrations"
  ON public.portal_integrations FOR SELECT
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert portal integrations"
  ON public.portal_integrations FOR INSERT
  WITH CHECK (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can update portal integrations"
  ON public.portal_integrations FOR UPDATE
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete portal integrations"
  ON public.portal_integrations FOR DELETE
  USING (account_id = get_user_account_id(auth.uid()));

-- RLS para portal_sync_logs
ALTER TABLE public.portal_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view sync logs"
  ON public.portal_sync_logs FOR SELECT
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Service role can insert sync logs"
  ON public.portal_sync_logs FOR INSERT
  WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_portal_integrations_account_id ON public.portal_integrations(account_id);
CREATE INDEX IF NOT EXISTS idx_portal_sync_logs_account_id ON public.portal_sync_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_portal_sync_logs_property_id ON public.portal_sync_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_properties_publish_to_portals ON public.properties(publish_to_portals) WHERE publish_to_portals = true;

-- Trigger de updated_at para portal_integrations
CREATE TRIGGER update_portal_integrations_updated_at
  BEFORE UPDATE ON public.portal_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
