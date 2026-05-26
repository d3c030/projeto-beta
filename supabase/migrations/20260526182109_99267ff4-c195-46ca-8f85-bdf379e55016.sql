
ALTER TABLE public.contact_settings
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'rosa';
