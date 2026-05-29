-- Columnas de oferta en insumos (referenciadas por la app y por trg_insumos_audit_log de 007)
-- Ejecutar ANTES de: SELECT * FROM limpiar_insumos_duplicados();

ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS en_oferta BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(12, 4);
