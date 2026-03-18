-- Atualizar contrato da Larissa com dados completos do PDF
UPDATE public.contracts
SET
  rental_value = 650.00,
  payment_day = 6,
  pre_paid = true,
  tenant_rg = '13.547.626-9 / IIPR',
  tenant_profession = 'Analista de Sistemas',
  adjustment_index = 'IPCA+',
  guarantee_type = 'caucao_dinheiro',
  guarantee_value = 650.00,
  updated_at = now()
WHERE id = '15b11e0c-4b6b-48bc-a61e-a4342fe48ad6';

-- Atualizar dados do proprietário no imóvel
UPDATE public.properties
SET
  owner_email = 'wyldwagnericm@gmail.com',
  owner_contact = '(41) 98452-0339',
  updated_at = now()
WHERE id = '9680d22d-68d1-4a11-9223-f5c9325fba07';