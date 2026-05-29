-- Modalidad de negocio (Casa / Local) y gastos fijos operativos
-- Ejecutar en Supabase → SQL Editor (después de 005_ventas_pos_finanzas.sql)

CREATE TABLE IF NOT EXISTS public.config_negocio (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  modalidad TEXT NOT NULL DEFAULT 'casa' CHECK (modalidad IN ('casa', 'local')),
  costo_oportunidad_casa NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo_oportunidad_casa >= 0),
  renta NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (renta >= 0),
  luz NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (luz >= 0),
  gas NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (gas >= 0),
  internet NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (internet >= 0),
  otros_servicios NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (otros_servicios >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.config_negocio (id, modalidad)
VALUES (1, 'casa')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.config_negocio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_negocio_anon_all" ON public.config_negocio;
CREATE POLICY "config_negocio_anon_all" ON public.config_negocio
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
