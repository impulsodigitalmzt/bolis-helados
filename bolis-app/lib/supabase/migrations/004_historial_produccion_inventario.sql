-- Inventario: stock actual en insumos + historial de producción + descuento transaccional
-- Ejecutar en Supabase → SQL Editor (después de 003_sabores_rendimiento_guardar_receta.sql)

ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS cantidad_actual NUMERIC(14, 6) NOT NULL DEFAULT 0
    CHECK (cantidad_actual >= 0);

CREATE TABLE IF NOT EXISTS public.historial_produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  sabor_id UUID NOT NULL REFERENCES public.sabores (id) ON DELETE RESTRICT,
  cantidad NUMERIC(12, 4) NOT NULL CHECK (cantidad > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_produccion_fecha
  ON public.historial_produccion (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_historial_produccion_sabor
  ON public.historial_produccion (sabor_id);

-- Registra producción y descuenta insumos según receta (proporcional al rendimiento del lote)
CREATE OR REPLACE FUNCTION public.registrar_produccion(
  p_sabor_id UUID,
  p_cantidad NUMERIC,
  p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_historial_id UUID;
  v_rendimiento NUMERIC(12, 4);
  v_factor NUMERIC(14, 8);
  v_receta RECORD;
  v_consumo NUMERIC(14, 6);
  v_stock NUMERIC(14, 6);
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a 0';
  END IF;

  SELECT rendimiento INTO v_rendimiento
  FROM public.sabores
  WHERE id = p_sabor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sabor no encontrado';
  END IF;

  v_rendimiento := COALESCE(NULLIF(v_rendimiento, 0), 1);
  v_factor := p_cantidad / v_rendimiento;

  IF NOT EXISTS (
    SELECT 1 FROM public.recetas WHERE sabor_id = p_sabor_id
  ) THEN
    RAISE EXCEPTION 'El sabor no tiene receta configurada';
  END IF;

  -- Validar stock antes de modificar nada
  FOR v_receta IN
    SELECT r.insumo_id, r.cantidad_usada, i.nombre, i.unidad, i.cantidad_actual
    FROM public.recetas r
    INNER JOIN public.insumos i ON i.id = r.insumo_id
    WHERE r.sabor_id = p_sabor_id
  LOOP
    v_consumo := ROUND(v_receta.cantidad_usada * v_factor, 6);
    v_stock := v_receta.cantidad_actual;

    IF v_stock < v_consumo THEN
      RAISE EXCEPTION 'No hay suficiente % para esta producción (necesitas % %, hay % %)',
        v_receta.nombre,
        TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM v_consumo::TEXT)),
        v_receta.unidad,
        TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM v_stock::TEXT)),
        v_receta.unidad;
    END IF;
  END LOOP;

  INSERT INTO public.historial_produccion (fecha, sabor_id, cantidad)
  VALUES (COALESCE(p_fecha, CURRENT_DATE), p_sabor_id, p_cantidad)
  RETURNING id INTO v_historial_id;

  FOR v_receta IN
    SELECT r.insumo_id, r.cantidad_usada
    FROM public.recetas r
    WHERE r.sabor_id = p_sabor_id
  LOOP
    v_consumo := ROUND(v_receta.cantidad_usada * v_factor, 6);

    UPDATE public.insumos
    SET cantidad_actual = cantidad_actual - v_consumo
    WHERE id = v_receta.insumo_id;
  END LOOP;

  RETURN v_historial_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_produccion(UUID, NUMERIC, DATE)
  TO anon, authenticated;

ALTER TABLE public.historial_produccion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_produccion_anon_all" ON public.historial_produccion;
CREATE POLICY "historial_produccion_anon_all" ON public.historial_produccion
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
