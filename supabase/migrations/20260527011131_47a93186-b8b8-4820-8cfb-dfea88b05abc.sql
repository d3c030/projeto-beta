
CREATE TABLE public.appointment_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  paid_at date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_payments_appointment_id
  ON public.appointment_payments(appointment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_payments TO authenticated;
GRANT ALL ON public.appointment_payments TO service_role;

ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read appointment_payments"
  ON public.appointment_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert appointment_payments"
  ON public.appointment_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update appointment_payments"
  ON public.appointment_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete appointment_payments"
  ON public.appointment_payments FOR DELETE TO authenticated USING (true);
