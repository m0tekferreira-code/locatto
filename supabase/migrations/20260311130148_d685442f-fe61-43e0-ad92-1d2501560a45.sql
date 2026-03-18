UPDATE invoices SET account_id = c.account_id FROM contracts c WHERE invoices.contract_id = c.id AND invoices.account_id IS NULL AND c.account_id IS NOT NULL;

UPDATE lancamentos_financeiros SET account_id = c.account_id FROM contracts c WHERE lancamentos_financeiros.id_contrato = c.id AND lancamentos_financeiros.account_id IS NULL AND c.account_id IS NOT NULL;