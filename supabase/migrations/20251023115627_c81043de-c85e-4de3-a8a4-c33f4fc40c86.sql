-- Add missing tenant fields to contracts table
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS tenant_rg text,
ADD COLUMN IF NOT EXISTS tenant_profession text,
ADD COLUMN IF NOT EXISTS tenant_emergency_phone text,
ADD COLUMN IF NOT EXISTS co_tenants jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contracts.tenant_rg IS 'RG/Identity document of the tenant';
COMMENT ON COLUMN public.contracts.tenant_profession IS 'Profession/occupation of the tenant';
COMMENT ON COLUMN public.contracts.tenant_emergency_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN public.contracts.co_tenants IS 'Array of co-tenants/residents: [{"name": "...", "document": "...", "relationship": "..."}]';