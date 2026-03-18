-- Vincular Mayara à conta do Wyldwagner
UPDATE profiles 
SET account_id = '8a96b440-23ee-40b4-a661-ed0ea86534be', 
    full_name = 'Mayara' 
WHERE id = '90aef40c-55b5-427e-8ad2-dadd3081109c';

-- Atualizar role para 'agenda' (funcionária)
UPDATE user_roles 
SET role = 'agenda' 
WHERE user_id = '90aef40c-55b5-427e-8ad2-dadd3081109c';