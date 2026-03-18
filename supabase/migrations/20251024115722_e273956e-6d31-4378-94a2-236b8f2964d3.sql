-- Update app_role enum to include new role types
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'full';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agenda';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cadastro_leads';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';

-- Add status column to profiles table for user activation/deactivation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_access TIMESTAMP WITH TIME ZONE;

-- Create policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create policy to allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Update existing policies for user_roles to allow admins to manage roles
-- (policies already exist, just documenting the expected behavior)

-- Create index for better performance on profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_last_access ON public.profiles(last_access);