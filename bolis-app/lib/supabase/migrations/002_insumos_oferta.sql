-- Columnas de oferta en insumos + precio efectivo en recálculo de recetas
-- Ejecutar en Supabase → SQL Editor (después de 001_recetas_insumos.sql)

ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS en_oferta BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(12, 4) CHECK (precio_oferta IS NULL OR precio_oferta >= 0);

-- Precio usado en recetas: oferta activa → precio_oferta, si no → precio lista
CREATE OR REPLACE FUNCTION public.precio_efectivo_insumo(i public.insumos)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN i.en_oferta AND i.precio_oferta IS NOT NULL THEN i.precio_oferta
    ELSE i.precio
  END;
$$;

CREATE OR REPLACE FUNCTION public.recalcular_costo_sabor(p_sabor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_costo NUMERIC(12, 4);
BEGIN
  SELECT COALESCE(SUM(r.cantidad_usada * public.precio_efectivo_insumo(i)), 0)
  INTO v_costo
  FROM public.recetas r
  INNER JOIN public.insumos i ON i.id = r.insumo_id
  WHERE r.sabor_id = p_sabor_id;

  UPDATE public.sabores
  SET costo_produccion_unitario = ROUND(v_costo, 4)
  WHERE id = p_sabor_id;
END;
$$;

-- Recalcular si cambia precio, precio_oferta o estado de oferta
CREATE OR REPLACE FUNCTION public.trg_insumos_precio_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.precio IS DISTINCT FROM NEW.precio
    OR OLD.precio_oferta IS DISTINCT FROM NEW.precio_oferta
    OR OLD.en_oferta IS DISTINCT FROM NEW.en_oferta
  ) THEN
    PERFORM public.recalcular_costos_por_insumo(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
