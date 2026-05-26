CREATE TABLE public.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  default_price numeric NOT NULL DEFAULT 0,
  estimated_minutes integer NOT NULL DEFAULT 30,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT ALL ON public.procedures TO service_role;

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read procedures" ON public.procedures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert procedures" ON public.procedures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update procedures" ON public.procedures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete procedures" ON public.procedures FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_procedures_touch
BEFORE UPDATE ON public.procedures
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.procedures (name, default_price, estimated_minutes, sort_order) VALUES
  ('Design de Sobrancelha', 50, 30, 10),
  ('Henna', 40, 30, 20),
  ('Tintura de Sobrancelha', 50, 40, 30),
  ('Brow Lamination', 150, 60, 40),
  ('Aplicação de Buço', 25, 15, 50),
  ('Piercing: Nostril', 90, 30, 60),
  ('Piercing: Tragus', 110, 30, 70),
  ('Piercing: Helix / Mid Helix', 110, 30, 80),
  ('Piercing: Flat', 120, 30, 90),
  ('Piercing: Conch', 130, 30, 100),
  ('Piercing: Septo', 140, 30, 110),
  ('Piercing: Umbigo', 130, 40, 120),
  ('Piercing: Mamilo', 160, 40, 130),
  ('Piercing: Lóbulo (1º, 2º ou 3º furo)', 80, 20, 140),
  ('Piercing: Supercílio', 120, 30, 150),
  ('Piercing: Labret / Vertical Labret', 130, 30, 160),
  ('Microdermal', 180, 45, 170),
  ('Retoque de Micropigmentação', 200, 90, 180),
  ('Troca de Joia / Atualização', 40, 15, 190),
  ('Remoção de Joia', 20, 10, 200);