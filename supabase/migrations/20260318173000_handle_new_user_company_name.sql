-- Use company name from signup metadata to create account_name automatically.
-- Priority: company_name -> company -> full_name -> email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
DECLARE
  is_first_user BOOLEAN;
  new_account_id uuid;
  v_full_name text;
  v_company_name text;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) INTO is_first_user;

  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_company_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'company_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'company'), ''),
    v_full_name,
    NEW.email
  );

  INSERT INTO public.accounts (owner_id, account_name, subscription_status, data_expiracao)
  VALUES (
    NEW.id,
    v_company_name,
    'trial',
    now() + interval '14 days'
  )
  RETURNING id INTO new_account_id;

  INSERT INTO public.profiles (id, full_name, account_id, data_expiracao)
  VALUES (
    NEW.id,
    v_full_name,
    new_account_id,
    now() + interval '14 days'
  );

  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'trial');
  END IF;

  RETURN NEW;
END;
$function$;
