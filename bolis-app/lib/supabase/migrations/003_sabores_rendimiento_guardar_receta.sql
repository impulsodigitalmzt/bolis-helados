-- Rendimiento por lote + costo unitario (total / rendimiento) + guardado transaccional
-- Ejecutar en Supabase → SQL Editor (después de 002_insumos_oferta.sql)

ALTER TABLE public.sabores
  ADD COLUMN IF NOT EXISTS rendimiento NUMERIC(12, 4) NOT NULL DEFAULT 1
    CHECK (rendimiento > 0);

-- Costo unitario = costo total del lote ÷ piezas por lote
CREATE OR REPLACE FUNCTION public.recalcular_costo_sabor(p_sabor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC(12, 4);
  v_rend NUMERIC(12, 4);
BEGIN
  SELECT COALESCE(SUM(r.cantidad_usada * public.precio_efectivo_insumo(i)), 0)
  INTO v_total
  FROM public.recetas r
  INNER JOIN public.insumos i ON i.id = r.insumo_id
  WHERE r.sabor_id = p_sabor_id;

  SELECT rendimiento INTO v_rend FROM public.sabores WHERE id = p_sabor_id;
  v_rend := COALESCE(NULLIF(v_rend, 0), 1);

  UPDATE public.sabores
  SET costo_produccion_unitario = ROUND(v_total / v_rend, 4)
  WHERE id = p_sabor_id;
END;
$$;

-- Transacción: nombre + rendimiento + reemplazar líneas de receta
CREATE OR REPLACE FUNCTION public.guardar_receta_sabor(
  p_sabor_id UUID,
  p_nombre TEXT,
  p_rendimiento NUMERIC,
  p_lineas JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TRIM(p_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre del sabor es obligatorio';
  END IF;

  IF p_rendimiento IS NULL OR p_rendimiento <= 0 THEN
    RAISE EXCEPTION 'El rendimiento debe ser mayor a 0';
  END IF;

  UPDATE public.sabores
  SET
    nombre = TRIM(p_nombre),
    rendimiento = p_rendimiento
  WHERE id = p_sabor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sabor no encontrado';
  END IF;

  DELETE FROM public.recetas WHERE sabor_id = p_sabor_id;

  INSERT INTO public.recetas (sabor_id, insumo_id, cantidad_usada)
  SELECT
    p_sabor_id,
    (elem->>'insumo_id')::UUID,
    (elem->>'cantidad_usada')::NUMERIC
  FROM jsonb_array_elements(COALESCE(p_lineas, '[]'::jsonb)) AS elem
  WHERE (elem->>'insumo_id') IS NOT NULL
    AND (elem->>'cantidad_usada')::NUMERIC > 0;

  PERFORM public.recalcular_costo_sabor(p_sabor_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardar_receta_sabor(UUID, TEXT, NUMERIC, JSONB)
  TO anon, authenticated;
