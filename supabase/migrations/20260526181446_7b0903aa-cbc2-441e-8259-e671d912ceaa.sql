
CREATE TABLE public.contact_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_url text NOT NULL DEFAULT '',
  whatsapp_phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contact_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_settings TO authenticated;
GRANT ALL ON public.contact_settings TO service_role;

ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read contact_settings" ON public.contact_settings FOR SELECT USING (true);
CREATE POLICY "Auth insert contact_settings" ON public.contact_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update contact_settings" ON public.contact_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete contact_settings" ON public.contact_settings FOR DELETE TO authenticated USING (true);

CREATE TRIGGER contact_settings_touch_updated_at
BEFORE UPDATE ON public.contact_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.contact_settings (instagram_url, whatsapp_phone)
VALUES ('https://www.instagram.com/studiotaianeoliveira/', '5511964040524');
