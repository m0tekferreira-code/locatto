-- Adicionar campo para foto de capa
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS cover_photo TEXT;