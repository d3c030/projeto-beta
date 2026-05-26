
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  time TEXT,
  client_name TEXT NOT NULL,
  procedure TEXT,
  payment_method TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX appointments_date_idx ON public.appointments(date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO anon, authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read appointments" ON public.appointments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Open insert appointments" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Open update appointments" ON public.appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Open delete appointments" ON public.appointments FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_date_idx ON public.expenses(date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read expenses" ON public.expenses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Open insert expenses" ON public.expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Open update expenses" ON public.expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Open delete expenses" ON public.expenses FOR DELETE TO anon, authenticated USING (true);
