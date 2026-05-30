ALTER TABLE public.agenda_days DROP CONSTRAINT IF EXISTS agenda_days_date_key;
ALTER TABLE public.agenda_days ADD CONSTRAINT agenda_days_tenant_date_key UNIQUE (tenant_id, date);