-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for contract-documents bucket
CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can view contract documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can delete contract documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contract-documents');

-- Add documents column to contracts table
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;