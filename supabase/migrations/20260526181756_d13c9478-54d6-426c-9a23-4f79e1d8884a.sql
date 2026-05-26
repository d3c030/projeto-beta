
ALTER TABLE public.contact_settings ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';

INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Auth upload branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding');

CREATE POLICY "Auth update branding"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding');

CREATE POLICY "Auth delete branding"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding');
