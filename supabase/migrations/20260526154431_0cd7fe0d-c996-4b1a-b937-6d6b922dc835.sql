
-- Lock down all tables to authenticated users (painel privado, login obrigatório)

-- appointments
DROP POLICY IF EXISTS "Open read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Open insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Open update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Open delete appointments" ON public.appointments;

REVOKE ALL ON public.appointments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

CREATE POLICY "Authenticated read appointments" ON public.appointments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete appointments" ON public.appointments
  FOR DELETE TO authenticated USING (true);

-- expenses
DROP POLICY IF EXISTS "Open read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Open insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Open update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Open delete expenses" ON public.expenses;

REVOKE ALL ON public.expenses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;

CREATE POLICY "Authenticated read expenses" ON public.expenses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert expenses" ON public.expenses
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update expenses" ON public.expenses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete expenses" ON public.expenses
  FOR DELETE TO authenticated USING (true);

-- clients
DROP POLICY IF EXISTS "Open read clients" ON public.clients;
DROP POLICY IF EXISTS "Open insert clients" ON public.clients;
DROP POLICY IF EXISTS "Open update clients" ON public.clients;
DROP POLICY IF EXISTS "Open delete clients" ON public.clients;

REVOKE ALL ON public.clients FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;

CREATE POLICY "Authenticated read clients" ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete clients" ON public.clients
  FOR DELETE TO authenticated USING (true);

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.normalize_client_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(trim(coalesce(_name, '')), '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Lock down SECURITY DEFINER trigger function (only runs from triggers, not callable from API)
REVOKE EXECUTE ON FUNCTION public.ensure_client_for_appointment() FROM anon, authenticated, PUBLIC;
