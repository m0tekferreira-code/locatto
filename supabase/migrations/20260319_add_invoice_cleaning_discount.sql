-- Add cleaning_fee and discount fields to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS cleaning_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_description text;

COMMENT ON COLUMN public.invoices.cleaning_fee IS 'Taxa de limpeza de lixeiras e corredores';
COMMENT ON COLUMN public.invoices.discount IS 'Valor do desconto aplicado (positivo)';
COMMENT ON COLUMN public.invoices.discount_description IS 'Descrição/motivo do desconto';
