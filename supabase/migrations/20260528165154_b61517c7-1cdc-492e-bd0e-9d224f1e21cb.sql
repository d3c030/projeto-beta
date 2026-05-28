
CREATE TYPE referral_status AS ENUM ('novo', 'contatado', 'em_negociacao', 'fechado', 'perdido');

CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT current_tenant_id(auth.uid()),
  referrer_user_id UUID,
  referrer_name TEXT NOT NULL DEFAULT '',
  referred_name TEXT NOT NULL,
  referred_whatsapp TEXT NOT NULL,
  status referral_status NOT NULL DEFAULT 'novo',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope read referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (tenant_id = current_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Tenant scope insert referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = current_tenant_id(auth.uid()));

CREATE POLICY "Superadmin update referrals"
  ON public.referrals FOR UPDATE
  TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin delete referrals"
  ON public.referrals FOR DELETE
  TO authenticated
  USING (is_superadmin(auth.uid()));

CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_referrals_tenant ON public.referrals(tenant_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_created ON public.referrals(created_at DESC);
