UPDATE invoices i
SET property_id = c.property_id
FROM contracts c
WHERE i.contract_id = c.id
  AND i.property_id IS NULL
  AND c.property_id IS NOT NULL;