-- AP 101 (AP 01 - Bloco 1): Titular Victoria, co-tenant Amanda Toledo
UPDATE contracts SET co_tenants = '[{"name":"Amanda Toledo Piza de Melo e Silva","document":"106.221.259-23"}]'::jsonb, updated_at = now()
WHERE id = '77a72da8-01e0-4f24-af07-936633fe3978';

-- AP 103 (AP 3 - Bloco 1): Titular Leandro, co-tenant Amanda Martins
UPDATE contracts SET co_tenants = '[{"name":"Amanda Martins De Morais","document":"138.205.559-51"}]'::jsonb, updated_at = now()
WHERE id = 'ea9e656d-9651-4d1d-b6cf-6681237cd0c7';

-- AP 106 (AP 6 - Bloco 1): Titular Amanda Alves, co-tenant Juliano
UPDATE contracts SET co_tenants = '[{"name":"Juliano Rodrigues Ferreira","document":"132.948.119-42"}]'::jsonb, updated_at = now()
WHERE id = '03310b38-0f28-4411-9177-5ed403f07649';

-- AP 117 (AP 17 - Bloco 1): Titular Francisco Kawan, co-tenant Luiza
UPDATE contracts SET co_tenants = '[{"name":"Luiza Oliveira Hans","document":"462.727.018-61"}]'::jsonb, updated_at = now()
WHERE id = 'd2631526-75ee-4ff6-8ee0-fb403312acea';

-- AP 215 (AP 15 - Bloco 2): Titular Cassia, co-tenant Elvis
UPDATE contracts SET co_tenants = '[{"name":"Elvis Henrique de Araujo Selzelein","document":"130.393.409-48"}]'::jsonb, updated_at = now()
WHERE id = 'ad80a297-6bcf-45aa-9522-6725a62c8f6e';

-- AP 221 (AP 21 - Bloco 2): Titular Claudio, co-tenant Leandro Campos
UPDATE contracts SET co_tenants = '[{"name":"Leandro Campos de Amorim","document":"010.657.649-60"}]'::jsonb, updated_at = now()
WHERE id = 'b09e447a-6916-4e87-9f13-bb3a5eb0b010';

-- AP 222 (AP 22 - Bloco 2): Titular Lucas, co-tenant Julia
UPDATE contracts SET co_tenants = '[{"name":"Julia Silva Roberto","document":"156.160.129-20"}]'::jsonb, updated_at = now()
WHERE id = '4fc34876-2a15-4fc1-a9ce-a81aeefa4f00';

-- AP 229 (AP 29 - Bloco 2): Titular Cintia, co-tenant Roberth
UPDATE contracts SET co_tenants = '[{"name":"Roberth Wallan Lima","document":"465.866.098-95"}]'::jsonb, updated_at = now()
WHERE id = 'cd341a3b-611b-4954-816d-f8902c9e3594';

-- AP 304 (AP 304 - Bloco 3): Titular Fabio, co-tenant Carolina
UPDATE contracts SET co_tenants = '[{"name":"Carolina De Fatima Xavier","document":"159.896.349-00"}]'::jsonb, updated_at = now()
WHERE id = 'd74a507e-f5d0-4aec-8929-fb723622c89a';

-- AP 116: Higor tem contrato no AP 3 - Bloco 1 por erro. Corrigir o property_id para AP 16 - Bloco 1
-- Primeiro precisamos do ID do AP 16 - Bloco 1
UPDATE contracts 
SET property_id = (SELECT id FROM properties WHERE name = 'AP 16 - Bloco 1' LIMIT 1),
    co_tenants = '[{"name":"Vitoria Demenjon dos Santos","document":"143.963.799-78"}]'::jsonb,
    updated_at = now()
WHERE id = '9ee34653-25de-4604-9171-e3631dc89494';