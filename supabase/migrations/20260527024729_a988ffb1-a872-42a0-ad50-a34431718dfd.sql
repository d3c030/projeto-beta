
-- appointments
DROP POLICY IF EXISTS "Tenant scope read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Tenant scope insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Tenant scope update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Tenant scope delete appointments" ON public.appointments;

CREATE POLICY "Tenant scope read appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope update appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));

-- appointment_payments
DROP POLICY IF EXISTS "Tenant scope read appt_payments" ON public.appointment_payments;
DROP POLICY IF EXISTS "Tenant scope insert appt_payments" ON public.appointment_payments;
DROP POLICY IF EXISTS "Tenant scope update appt_payments" ON public.appointment_payments;
DROP POLICY IF EXISTS "Tenant scope delete appt_payments" ON public.appointment_payments;

CREATE POLICY "Tenant scope read appt_payments" ON public.appointment_payments
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert appt_payments" ON public.appointment_payments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope update appt_payments" ON public.appointment_payments
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete appt_payments" ON public.appointment_payments
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));

-- agenda_days (mantém leitura pública existente, restringe escrita ao tenant)
DROP POLICY IF EXISTS "Tenant scope insert agenda_days" ON public.agenda_days;
DROP POLICY IF EXISTS "Tenant scope update agenda_days" ON public.agenda_days;
DROP POLICY IF EXISTS "Tenant scope delete agenda_days" ON public.agenda_days;

CREATE POLICY "Tenant scope insert agenda_days" ON public.agenda_days
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope update agenda_days" ON public.agenda_days
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete agenda_days" ON public.agenda_days
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));

-- clients
DROP POLICY IF EXISTS "Tenant scope read clients" ON public.clients;
DROP POLICY IF EXISTS "Tenant scope insert clients" ON public.clients;
DROP POLICY IF EXISTS "Tenant scope update clients" ON public.clients;
DROP POLICY IF EXISTS "Tenant scope delete clients" ON public.clients;

CREATE POLICY "Tenant scope read clients" ON public.clients
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));

-- expenses
DROP POLICY IF EXISTS "Tenant scope read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Tenant scope insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Tenant scope update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Tenant scope delete expenses" ON public.expenses;

CREATE POLICY "Tenant scope read expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope update expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));

-- procedures
DROP POLICY IF EXISTS "Tenant scope read procedures" ON public.procedures;
DROP POLICY IF EXISTS "Tenant scope insert procedures" ON public.procedures;
DROP POLICY IF EXISTS "Tenant scope update procedures" ON public.procedures;
DROP POLICY IF EXISTS "Tenant scope delete procedures" ON public.procedures;

CREATE POLICY "Tenant scope read procedures" ON public.procedures
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert procedures" ON public.procedures
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope update procedures" ON public.procedures
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete procedures" ON public.procedures
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));
