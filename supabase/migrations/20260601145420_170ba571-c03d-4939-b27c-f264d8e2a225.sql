
-- ============================================================
-- payment_logs: monthly billing log per tenant
-- ============================================================
CREATE TYPE public.payment_log_status AS ENUM (
  'pendente', 'aguardando_conferencia', 'pago', 'rejeitado'
);

CREATE TABLE public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL, -- first day of the month
  qr_visualizado_em timestamptz,
  comprovante_url text,
  comprovante_enviado_em timestamptz,
  status public.payment_log_status NOT NULL DEFAULT 'pendente',
  revisado_em timestamptz,
  revisado_por uuid,
  nota_revisao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, mes_referencia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_logs TO authenticated;
GRANT ALL ON public.payment_logs TO service_role;

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read own payment_logs" ON public.payment_logs
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Tenant insert own payment_logs" ON public.payment_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Tenant update own payment_logs" ON public.payment_logs
  FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Superadmin delete payment_logs" ON public.payment_logs
  FOR DELETE TO authenticated
  USING (is_superadmin(auth.uid()));

CREATE TRIGGER trg_payment_logs_updated_at
  BEFORE UPDATE ON public.payment_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- daily_costs: bills/boletos to pay (tenant or master)
-- ============================================================
CREATE TYPE public.daily_cost_status AS ENUM ('pendente', 'pago');

CREATE TABLE public.daily_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = master cost
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_vencimento date NOT NULL,
  status public.daily_cost_status NOT NULL DEFAULT 'pendente',
  pago_em timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_costs_tenant_vencimento ON public.daily_costs (tenant_id, data_vencimento);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_costs TO authenticated;
GRANT ALL ON public.daily_costs TO service_role;

ALTER TABLE public.daily_costs ENABLE ROW LEVEL SECURITY;

-- Tenant scope: see/manage own costs only
CREATE POLICY "Tenant read own daily_costs" ON public.daily_costs
  FOR SELECT TO authenticated
  USING (
    (tenant_id IS NOT NULL AND tenant_id = current_tenant_id(auth.uid()))
    OR is_superadmin(auth.uid())
  );

CREATE POLICY "Tenant insert own daily_costs" ON public.daily_costs
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id = current_tenant_id(auth.uid()))
    OR is_superadmin(auth.uid())
  );

CREATE POLICY "Tenant update own daily_costs" ON public.daily_costs
  FOR UPDATE TO authenticated
  USING (
    (tenant_id IS NOT NULL AND tenant_id = current_tenant_id(auth.uid()))
    OR is_superadmin(auth.uid())
  )
  WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id = current_tenant_id(auth.uid()))
    OR is_superadmin(auth.uid())
  );

CREATE POLICY "Tenant delete own daily_costs" ON public.daily_costs
  FOR DELETE TO authenticated
  USING (
    (tenant_id IS NOT NULL AND tenant_id = current_tenant_id(auth.uid()))
    OR is_superadmin(auth.uid())
  );

CREATE TRIGGER trg_daily_costs_updated_at
  BEFORE UPDATE ON public.daily_costs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- Storage: comprovantes bucket (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- Files are organized as {tenant_id}/{filename}
CREATE POLICY "Tenant upload own comprovante"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = current_tenant_id(auth.uid())::text
  );

CREATE POLICY "Tenant read own comprovante"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND (
      (storage.foldername(name))[1] = current_tenant_id(auth.uid())::text
      OR is_superadmin(auth.uid())
    )
  );

CREATE POLICY "Tenant update own comprovante"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = current_tenant_id(auth.uid())::text
  );

CREATE POLICY "Superadmin delete comprovante"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'comprovantes' AND is_superadmin(auth.uid())
  );
