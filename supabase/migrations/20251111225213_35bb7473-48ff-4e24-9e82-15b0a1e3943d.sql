-- PARTE 1: Adicionar novos valores ao enum app_role
-- Esta migração só adiciona os valores ao enum

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'trial';