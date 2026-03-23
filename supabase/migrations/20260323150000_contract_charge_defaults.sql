-- Adiciona colunas de cobranças padrão na tabela contracts
-- Permite que o wizard pre-configure os valores que serão usados nas faturas geradas

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS condo_fee        numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_amount     numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS electricity_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gas_amount       numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS internet_amount  numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cleaning_fee     numeric DEFAULT NULL;

COMMENT ON COLUMN contracts.condo_fee           IS 'Valor padrão do condomínio a cobrar na fatura';
COMMENT ON COLUMN contracts.water_amount        IS 'Valor padrão da água a cobrar na fatura';
COMMENT ON COLUMN contracts.electricity_amount  IS 'Valor padrão da luz a cobrar na fatura';
COMMENT ON COLUMN contracts.gas_amount          IS 'Valor padrão do gás a cobrar na fatura';
COMMENT ON COLUMN contracts.internet_amount     IS 'Valor padrão da internet a cobrar na fatura';
COMMENT ON COLUMN contracts.cleaning_fee        IS 'Valor padrão da limpeza a cobrar na fatura';
