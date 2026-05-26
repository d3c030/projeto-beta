ALTER TABLE public.contact_settings
  ADD COLUMN IF NOT EXISTS pix_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_copia_cola text NOT NULL DEFAULT '';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;