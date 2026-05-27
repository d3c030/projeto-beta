
-- 1) Add license fields to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS license_expires_at date,
  ADD COLUMN IF NOT EXISTS last_payment_at date;

-- 2) Payments history table
CREATE TABLE public.tenant_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_at date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  payment_method text,
  notes text,
  previous_expires_at date,
  new_expires_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_payments TO authenticated;
GRANT ALL ON public.tenant_payments TO service_role;

ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manage tenant_payments"
  ON public.tenant_payments
  FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Owner read own tenant_payments"
  ON public.tenant_payments
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id(auth.uid()));

CREATE INDEX idx_tenant_payments_tenant ON public.tenant_payments(tenant_id, paid_at DESC);
