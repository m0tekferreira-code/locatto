-- Step 1: Delete orphan lancamentos_financeiros linked to duplicate invoices that will be removed
DELETE FROM lancamentos_financeiros
WHERE invoice_id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY contract_id, reference_month ORDER BY created_at ASC) as rn
    FROM invoices
    WHERE contract_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Delete duplicate invoices (keep the first created one per contract+month)
DELETE FROM invoices
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY contract_id, reference_month ORDER BY created_at ASC) as rn
    FROM invoices
    WHERE contract_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 3: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_invoices_contract_reference_unique 
ON invoices (contract_id, reference_month) 
WHERE contract_id IS NOT NULL;