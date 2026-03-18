-- Atualizar role do Wyldwagner para super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = 'f58029a0-98b3-4da6-ba37-fdc7a2df4ba3';