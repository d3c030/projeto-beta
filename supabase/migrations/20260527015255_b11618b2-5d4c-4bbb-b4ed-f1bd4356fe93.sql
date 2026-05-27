
-- Set default on tenant_id columns so Supabase types treat them as optional on insert.
-- The default calls current_tenant_id(auth.uid()) at row time.
ALTER TABLE public.appointments ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id(auth.uid());
ALTER TABLE public.clients ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id(auth.uid());
ALTER TABLE public.expenses ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id(auth.uid());
ALTER TABLE public.procedures ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id(auth.uid());
ALTER TABLE public.agenda_days ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id(auth.uid());
ALTER TABLE public.appointment_payments ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id(auth.uid());
