-- Update RLS policies for profiles to include account-based access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Admins can view profiles in their account
CREATE POLICY "Admins can view profiles in their account"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND account_id = get_user_account_id(auth.uid())
);

-- Admins can update profiles in their account
CREATE POLICY "Admins can update profiles in their account"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND account_id = get_user_account_id(auth.uid())
);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Update RLS policies for properties to include account-based access
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;

-- Account members can view properties in their account
CREATE POLICY "Account members can view properties"
ON public.properties
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

-- Account members can insert properties
CREATE POLICY "Account members can insert properties"
ON public.properties
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

-- Account members can update properties in their account
CREATE POLICY "Account members can update properties"
ON public.properties
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

-- Account members can delete properties in their account
CREATE POLICY "Account members can delete properties"
ON public.properties
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for contracts
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;

CREATE POLICY "Account members can view contracts"
ON public.contracts
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert contracts"
ON public.contracts
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update contracts"
ON public.contracts
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete contracts"
ON public.contracts
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for invoices
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;

CREATE POLICY "Account members can view invoices"
ON public.invoices
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update invoices"
ON public.invoices
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete invoices"
ON public.invoices
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for lancamentos_financeiros
DROP POLICY IF EXISTS "Users can view their own lancamentos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can insert their own lancamentos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can update their own lancamentos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can delete their own lancamentos" ON public.lancamentos_financeiros;

CREATE POLICY "Account members can view lancamentos"
ON public.lancamentos_financeiros
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert lancamentos"
ON public.lancamentos_financeiros
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update lancamentos"
ON public.lancamentos_financeiros
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete lancamentos"
ON public.lancamentos_financeiros
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for contacts
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

CREATE POLICY "Account members can view contacts"
ON public.contacts
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can insert contacts"
ON public.contacts
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update contacts"
ON public.contacts
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete contacts"
ON public.contacts
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));

-- Update RLS policies for scheduled_visits
DROP POLICY IF EXISTS "Users can view their own scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Users can create their own scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Users can update their own scheduled visits" ON public.scheduled_visits;
DROP POLICY IF EXISTS "Users can delete their own scheduled visits" ON public.scheduled_visits;

CREATE POLICY "Account members can view scheduled visits"
ON public.scheduled_visits
FOR SELECT
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can create scheduled visits"
ON public.scheduled_visits
FOR INSERT
WITH CHECK (
  account_id = get_user_account_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Account members can update scheduled visits"
ON public.scheduled_visits
FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can delete scheduled visits"
ON public.scheduled_visits
FOR DELETE
USING (account_id = get_user_account_id(auth.uid()));