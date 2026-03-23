-- Super admins can manage billing_plans (INSERT, UPDATE, DELETE)
CREATE POLICY "Super admins can insert billing plans"
ON public.billing_plans
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update billing plans"
ON public.billing_plans
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete billing plans"
ON public.billing_plans
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));
