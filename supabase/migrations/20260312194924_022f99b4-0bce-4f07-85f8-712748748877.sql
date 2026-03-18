-- Corrigir todos os imóveis "available" que deveriam ser "rented"
-- Manter available APENAS: AP 8 - Bloco 2, AP 26 - Bloco 2, AP 4 - Bloco 1, AP 301/306/307/310/314 - Bloco 3
UPDATE properties 
SET status = 'rented', updated_at = now()
WHERE status = 'available'
AND name NOT IN (
  'AP 8 - Bloco 2',
  'AP 26 - Bloco 2',
  'AP 4 - Bloco 1',
  'AP 301 - Bloco 3',
  'AP 306 - Bloco 3',
  'AP 307 - Bloco 3',
  'AP 310 - Bloco 3',
  'AP 314 - Bloco 3'
);