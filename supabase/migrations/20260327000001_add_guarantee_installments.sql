-- Add guarantee_installments column to contracts table
-- Allows the user to choose how many installments the guarantee/caução will be split into
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS guarantee_installments integer DEFAULT 1;
