-- Criar buckets para fotos e documentos dos imóveis
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('property-photos', 'property-photos', true),
  ('property-documents', 'property-documents', false);

-- Políticas para fotos dos imóveis (público para leitura)
CREATE POLICY "Fotos são visíveis publicamente"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

CREATE POLICY "Usuários autenticados podem fazer upload de fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem atualizar suas próprias fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem deletar suas próprias fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-photos' 
  AND auth.role() = 'authenticated'
);

-- Políticas para documentos dos imóveis (privado)
CREATE POLICY "Usuários podem ver seus próprios documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários autenticados podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem atualizar seus próprios documentos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem deletar seus próprios documentos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-documents' 
  AND auth.role() = 'authenticated'
);

-- Adicionar campos para armazenar URLs dos arquivos
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;