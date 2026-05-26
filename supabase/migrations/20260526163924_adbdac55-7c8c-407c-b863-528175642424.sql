CREATE TABLE public.agenda_days (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  is_open boolean NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agenda_days TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_days TO authenticated;
GRANT ALL ON public.agenda_days TO service_role;

ALTER TABLE public.agenda_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read agenda_days" ON public.agenda_days FOR SELECT USING (true);
CREATE POLICY "Auth insert agenda_days" ON public.agenda_days FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update agenda_days" ON public.agenda_days FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete agenda_days" ON public.agenda_days FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_agenda_days_updated_at
BEFORE UPDATE ON public.agenda_days
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_agenda_days_date ON public.agenda_days(date);