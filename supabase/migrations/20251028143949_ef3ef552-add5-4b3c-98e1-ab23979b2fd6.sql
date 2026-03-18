-- Add expiration date column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS data_expiracao TIMESTAMPTZ;