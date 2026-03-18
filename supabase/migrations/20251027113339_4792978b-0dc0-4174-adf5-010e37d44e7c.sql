-- Add extra_charges column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS extra_charges JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance with JSONB queries
CREATE INDEX IF NOT EXISTS idx_contracts_extra_charges 
ON public.contracts USING gin(extra_charges);

COMMENT ON COLUMN public.contracts.extra_charges IS 'Array of additional charges (guarantee, iptu, condo fees, utilities, etc.) to be applied to invoices';