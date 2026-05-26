
-- 1. Tabela de clientes
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open read clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Open insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update clients" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete clients" ON public.clients FOR DELETE USING (true);

CREATE INDEX idx_clients_normalized_name ON public.clients (normalized_name);

-- 2. Função utilitária de normalização
CREATE OR REPLACE FUNCTION public.normalize_client_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(coalesce(_name, '')), '\s+', ' ', 'g'))
$$;

-- 3. Adicionar coluna client_id em appointments
ALTER TABLE public.appointments
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_appointments_client_id ON public.appointments (client_id);

-- 4. Backfill: criar clientes a partir dos atendimentos existentes
INSERT INTO public.clients (name, normalized_name)
SELECT
  (array_agg(client_name ORDER BY created_at DESC))[1] AS name,
  public.normalize_client_name(client_name) AS normalized_name
FROM public.appointments
WHERE client_name IS NOT NULL AND trim(client_name) <> ''
GROUP BY public.normalize_client_name(client_name)
ON CONFLICT (normalized_name) DO NOTHING;

-- 5. Ligar atendimentos existentes aos clientes
UPDATE public.appointments a
SET client_id = c.id
FROM public.clients c
WHERE a.client_id IS NULL
  AND public.normalize_client_name(a.client_name) = c.normalized_name;

-- 6. Trigger: garantir cliente ao inserir/atualizar atendimentos
CREATE OR REPLACE FUNCTION public.ensure_client_for_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text;
  _cid uuid;
BEGIN
  IF NEW.client_name IS NULL OR trim(NEW.client_name) = '' THEN
    RETURN NEW;
  END IF;

  _norm := public.normalize_client_name(NEW.client_name);

  IF NEW.client_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _cid FROM public.clients WHERE normalized_name = _norm LIMIT 1;

  IF _cid IS NULL THEN
    INSERT INTO public.clients (name, normalized_name)
    VALUES (trim(NEW.client_name), _norm)
    RETURNING id INTO _cid;
  END IF;

  NEW.client_id := _cid;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_ensure_client
BEFORE INSERT OR UPDATE OF client_name, client_id ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.ensure_client_for_appointment();

-- 7. Trigger updated_at em clients
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
