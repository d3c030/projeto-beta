
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('superadmin','tenant_owner','tenant_member');
CREATE TYPE public.tenant_status AS ENUM ('ativo','inadimplente','suspenso');

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  owner_name text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  plan_name text NOT NULL DEFAULT 'Básico',
  monthly_price numeric NOT NULL DEFAULT 0,
  due_day int NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 31),
  status public.tenant_status NOT NULL DEFAULT 'ativo',
  logo_url text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '',
  theme text NOT NULL DEFAULT 'rosa',
  instagram_url text NOT NULL DEFAULT '',
  pix_key text NOT NULL DEFAULT '',
  pix_copia_cola text NOT NULL DEFAULT '',
  pix_qr_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenants_touch_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_touch_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin')
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_tenant_status()
RETURNS public.tenant_status LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.status FROM public.tenants t
  JOIN public.profiles p ON p.tenant_id = t.id
  WHERE p.user_id = auth.uid() LIMIT 1
$$;

-- ============ SEED DEFAULT TENANT FROM contact_settings ============
INSERT INTO public.tenants (business_name, owner_name, whatsapp, slug, logo_url, theme, instagram_url, pix_key, pix_copia_cola, pix_qr_url)
SELECT 
  'Estúdio Principal','Administrador',
  COALESCE(whatsapp_phone, ''),'principal',
  COALESCE(logo_url, ''),COALESCE(NULLIF(theme,''), 'rosa'),
  COALESCE(instagram_url, ''),COALESCE(pix_key, ''),
  COALESCE(pix_copia_cola, ''),COALESCE(pix_qr_url, '')
FROM public.contact_settings ORDER BY updated_at DESC NULLS LAST LIMIT 1;

INSERT INTO public.tenants (business_name, slug)
SELECT 'Estúdio Principal', 'principal'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants);

-- ============ ASSIGN d3c030@gmail.com AS SUPERADMIN + OWNER ============
DO $$
DECLARE _uid uuid; _tid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'd3c030@gmail.com' LIMIT 1;
  SELECT id INTO _tid FROM public.tenants ORDER BY created_at LIMIT 1;
  IF _uid IS NOT NULL AND _tid IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, display_name, tenant_id) VALUES (_uid, 'Super Admin', _tid)
      ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;
    INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (_uid, 'superadmin', NULL)
      ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (_uid, 'tenant_owner', _tid)
      ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Create profiles for any other existing users (assign to default tenant as tenant_member)
DO $$
DECLARE _tid uuid; r RECORD;
BEGIN
  SELECT id INTO _tid FROM public.tenants ORDER BY created_at LIMIT 1;
  FOR r IN SELECT id, email FROM auth.users WHERE email <> 'd3c030@gmail.com' LOOP
    INSERT INTO public.profiles (user_id, display_name, tenant_id)
    VALUES (r.id, COALESCE(r.email, ''), _tid)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (r.id, 'tenant_member', _tid)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============ ADD tenant_id TO DATA TABLES + BACKFILL ============
DO $$
DECLARE _tid uuid;
BEGIN
  SELECT id INTO _tid FROM public.tenants ORDER BY created_at LIMIT 1;

  ALTER TABLE public.appointments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
  UPDATE public.appointments SET tenant_id = _tid WHERE tenant_id IS NULL;
  ALTER TABLE public.appointments ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_appointments_tenant ON public.appointments(tenant_id);

  ALTER TABLE public.clients ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
  UPDATE public.clients SET tenant_id = _tid WHERE tenant_id IS NULL;
  ALTER TABLE public.clients ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_clients_tenant ON public.clients(tenant_id);

  ALTER TABLE public.expenses ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
  UPDATE public.expenses SET tenant_id = _tid WHERE tenant_id IS NULL;
  ALTER TABLE public.expenses ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_expenses_tenant ON public.expenses(tenant_id);

  ALTER TABLE public.procedures ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
  UPDATE public.procedures SET tenant_id = _tid WHERE tenant_id IS NULL;
  ALTER TABLE public.procedures ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_procedures_tenant ON public.procedures(tenant_id);

  ALTER TABLE public.agenda_days ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
  UPDATE public.agenda_days SET tenant_id = _tid WHERE tenant_id IS NULL;
  ALTER TABLE public.agenda_days ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_agenda_days_tenant ON public.agenda_days(tenant_id);

  ALTER TABLE public.appointment_payments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
  UPDATE public.appointment_payments SET tenant_id = _tid WHERE tenant_id IS NULL;
  ALTER TABLE public.appointment_payments ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_appt_payments_tenant ON public.appointment_payments(tenant_id);
END $$;

-- ============ AUTO-FILL tenant_id TRIGGER ============
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id(auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER set_tenant_id_appointments BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER set_tenant_id_clients BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER set_tenant_id_expenses BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER set_tenant_id_procedures BEFORE INSERT ON public.procedures
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER set_tenant_id_agenda_days BEFORE INSERT ON public.agenda_days
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER set_tenant_id_appointment_payments BEFORE INSERT ON public.appointment_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- ============ REPLACE RLS POLICIES WITH TENANT-SCOPED ============
-- appointments
DROP POLICY IF EXISTS "Authenticated read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated delete appointments" ON public.appointments;
CREATE POLICY "Tenant scope read appointments" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert appointments" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()));
CREATE POLICY "Tenant scope update appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete appointments" ON public.appointments FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));

-- clients
DROP POLICY IF EXISTS "Authenticated read clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated delete clients" ON public.clients;
CREATE POLICY "Tenant scope read clients" ON public.clients FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()));
CREATE POLICY "Tenant scope update clients" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete clients" ON public.clients FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));

-- expenses
DROP POLICY IF EXISTS "Authenticated read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated delete expenses" ON public.expenses;
CREATE POLICY "Tenant scope read expenses" ON public.expenses FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()));
CREATE POLICY "Tenant scope update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));

-- procedures
DROP POLICY IF EXISTS "Auth read procedures" ON public.procedures;
DROP POLICY IF EXISTS "Auth insert procedures" ON public.procedures;
DROP POLICY IF EXISTS "Auth update procedures" ON public.procedures;
DROP POLICY IF EXISTS "Auth delete procedures" ON public.procedures;
CREATE POLICY "Tenant scope read procedures" ON public.procedures FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert procedures" ON public.procedures FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()));
CREATE POLICY "Tenant scope update procedures" ON public.procedures FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete procedures" ON public.procedures FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));

-- agenda_days (was public read; keep public read for booking page; writes tenant-scoped)
DROP POLICY IF EXISTS "Auth insert agenda_days" ON public.agenda_days;
DROP POLICY IF EXISTS "Auth update agenda_days" ON public.agenda_days;
DROP POLICY IF EXISTS "Auth delete agenda_days" ON public.agenda_days;
CREATE POLICY "Tenant scope insert agenda_days" ON public.agenda_days FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()));
CREATE POLICY "Tenant scope update agenda_days" ON public.agenda_days FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete agenda_days" ON public.agenda_days FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));

-- appointment_payments
DROP POLICY IF EXISTS "Authenticated read appointment_payments" ON public.appointment_payments;
DROP POLICY IF EXISTS "Authenticated insert appointment_payments" ON public.appointment_payments;
DROP POLICY IF EXISTS "Authenticated update appointment_payments" ON public.appointment_payments;
DROP POLICY IF EXISTS "Authenticated delete appointment_payments" ON public.appointment_payments;
CREATE POLICY "Tenant scope read appt_payments" ON public.appointment_payments FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope insert appt_payments" ON public.appointment_payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()));
CREATE POLICY "Tenant scope update appt_payments" ON public.appointment_payments FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Tenant scope delete appt_payments" ON public.appointment_payments FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.current_tenant_id(auth.uid()));

-- tenants policies
CREATE POLICY "Superadmin manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Owner read own tenant" ON public.tenants FOR SELECT TO authenticated
  USING (id = public.current_tenant_id(auth.uid()));
CREATE POLICY "Owner update own tenant" ON public.tenants FOR UPDATE TO authenticated
  USING (id = public.current_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_owner'))
  WITH CHECK (id = public.current_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_owner'));

-- user_roles policies
CREATE POLICY "Superadmin manage user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "User read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- profiles policies
CREATE POLICY "User read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "User update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Superadmin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
