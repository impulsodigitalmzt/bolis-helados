-- Preparaciones (ej. "Preparación base de leche"): receta intermedia, NO insumo.
-- Las recetas de productos pueden incluir preparaciones por lote.

ALTER TABLE public.sabores
  ADD COLUMN IF NOT EXISTS es_preparacion BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.recetas
  ALTER COLUMN insumo_id DROP NOT NULL;

ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS preparacion_sabor_id UUID
    REFERENCES public.sabores (id) ON DELETE RESTRICT;

ALTER TABLE public.recetas
  DROP CONSTRAINT IF EXISTS recetas_insumo_o_preparacion;

ALTER TABLE public.recetas
  ADD CONSTRAINT recetas_insumo_o_preparacion CHECK (
    (insumo_id IS NOT NULL AND preparacion_sabor_id IS NULL)
    OR (insumo_id IS NULL AND preparacion_sabor_id IS NOT NULL)
  );

DROP INDEX IF EXISTS recetas_sabor_insumo_unique;
CREATE UNIQUE INDEX IF NOT EXISTS recetas_sabor_insumo_unique
  ON public.recetas (sabor_id, insumo_id)
  WHERE insumo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recetas_sabor_preparacion_unique
  ON public.recetas (sabor_id, preparacion_sabor_id)
  WHERE preparacion_sabor_id IS NOT NULL;

-- Marcar preparaciones existentes
UPDATE public.sabores
SET es_preparacion = true
WHERE lower(trim(nombre)) LIKE '%preparacion base de leche%'
   OR lower(trim(nombre)) LIKE '%preparación base de leche%';

-- Pasar líneas de receta que apuntaban al insumo-homónimo → preparación
UPDATE public.recetas r
SET
  preparacion_sabor_id = s.id,
  insumo_id = NULL
FROM public.insumos i
INNER JOIN public.sabores s ON s.es_preparacion = true
  AND lower(trim(i.nombre)) = lower(trim(s.nombre))
WHERE r.insumo_id = i.id;

UPDATE public.recetas r
SET
  preparacion_sabor_id = s.id,
  insumo_id = NULL
FROM public.insumos i
CROSS JOIN public.sabores s
WHERE s.es_preparacion = true
  AND r.insumo_id = i.id
  AND r.preparacion_sabor_id IS NULL
  AND (
    lower(trim(i.nombre)) LIKE '%preparacion base de leche%'
    OR lower(trim(i.nombre)) LIKE '%preparación base de leche%'
  );

-- Quitar de insumos lo que ya es preparación
DELETE FROM public.insumos i
WHERE EXISTS (
  SELECT 1 FROM public.sabores s
  WHERE s.es_preparacion = true
    AND lower(trim(i.nombre)) = lower(trim(s.nombre))
)
OR lower(trim(i.nombre)) LIKE '%preparacion base de leche%'
OR lower(trim(i.nombre)) LIKE '%preparación base de leche%';

-- Costo de sabor = insumos + (lotes de preparación × costo unitario de la prep)
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
  SELECT COALESCE(SUM(costo_linea), 0)
  INTO v_total
  FROM (
    SELECT r.cantidad_usada * public.precio_efectivo_insumo(i) AS costo_linea
    FROM public.recetas r
    INNER JOIN public.insumos i ON i.id = r.insumo_id
    WHERE r.sabor_id = p_sabor_id
    UNION ALL
    SELECT r.cantidad_usada * sp.costo_produccion_unitario AS costo_linea
    FROM public.recetas r
    INNER JOIN public.sabores sp ON sp.id = r.preparacion_sabor_id
    WHERE r.sabor_id = p_sabor_id
  ) t;

  SELECT rendimiento INTO v_rend FROM public.sabores WHERE id = p_sabor_id;
  v_rend := COALESCE(NULLIF(v_rend, 0), 1);

  UPDATE public.sabores
  SET costo_produccion_unitario = ROUND(v_total / v_rend, 4)
  WHERE id = p_sabor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalcular_sabores_que_usan_preparacion(p_prep_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sabor_id UUID;
BEGIN
  FOR v_sabor_id IN
    SELECT DISTINCT r.sabor_id
    FROM public.recetas r
    WHERE r.preparacion_sabor_id = p_prep_id
  LOOP
    PERFORM public.recalcular_costo_sabor(v_sabor_id);
  END LOOP;
END;
$$;

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
DECLARE
  v_es_prep BOOLEAN;
  elem JSONB;
  v_prep_id UUID;
BEGIN
  IF TRIM(p_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre del sabor es obligatorio';
  END IF;

  IF p_rendimiento IS NULL OR p_rendimiento <= 0 THEN
    RAISE EXCEPTION 'El rendimiento debe ser mayor a 0';
  END IF;

  SELECT es_preparacion INTO v_es_prep FROM public.sabores WHERE id = p_sabor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sabor no encontrado';
  END IF;

  UPDATE public.sabores
  SET nombre = TRIM(p_nombre), rendimiento = p_rendimiento
  WHERE id = p_sabor_id;

  DELETE FROM public.recetas WHERE sabor_id = p_sabor_id;

  FOR elem IN SELECT * FROM jsonb_array_elements(COALESCE(p_lineas, '[]'::jsonb))
  LOOP
    IF COALESCE((elem->>'cantidad_usada')::NUMERIC, 0) <= 0 THEN
      CONTINUE;
    END IF;

    IF elem->>'preparacion_sabor_id' IS NOT NULL THEN
      IF v_es_prep THEN
        RAISE EXCEPTION 'Una preparación solo puede llevar insumos, no otra preparación';
      END IF;

      v_prep_id := (elem->>'preparacion_sabor_id')::UUID;
      IF NOT EXISTS (
        SELECT 1 FROM public.sabores WHERE id = v_prep_id AND es_preparacion = true
      ) THEN
        RAISE EXCEPTION 'La preparación seleccionada no existe o no es válida';
      END IF;

      INSERT INTO public.recetas (sabor_id, preparacion_sabor_id, cantidad_usada)
      VALUES (p_sabor_id, v_prep_id, (elem->>'cantidad_usada')::NUMERIC);
    ELSIF elem->>'insumo_id' IS NOT NULL THEN
      INSERT INTO public.recetas (sabor_id, insumo_id, cantidad_usada)
      VALUES (
        p_sabor_id,
        (elem->>'insumo_id')::UUID,
        (elem->>'cantidad_usada')::NUMERIC
      );
    END IF;
  END LOOP;

  PERFORM public.recalcular_costo_sabor(p_sabor_id);

  IF v_es_prep THEN
    PERFORM public.recalcular_sabores_que_usan_preparacion(p_sabor_id);
  END IF;
END;
$$;

-- Consumo real de insumos al producir (expande preparaciones)
CREATE OR REPLACE FUNCTION public.registrar_produccion(
  p_sabor_id UUID,
  p_cantidad NUMERIC,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_usuario TEXT DEFAULT 'app'
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
  v_nombre TEXT;
  v_usuario TEXT := COALESCE(NULLIF(TRIM(p_usuario), ''), 'app');
  v_linea RECORD;
  v_consumo NUMERIC(14, 6);
  v_stock NUMERIC(14, 6);
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a 0';
  END IF;

  SELECT nombre, rendimiento INTO v_nombre, v_rendimiento
  FROM public.sabores WHERE id = p_sabor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sabor no encontrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sabores WHERE id = p_sabor_id AND es_preparacion = true
  ) THEN
    RAISE EXCEPTION 'Las preparaciones no se registran en producción; produce el producto final';
  END IF;

  v_rendimiento := COALESCE(NULLIF(v_rendimiento, 0), 1);
  v_factor := p_cantidad / v_rendimiento;

  IF NOT EXISTS (SELECT 1 FROM public.recetas WHERE sabor_id = p_sabor_id) THEN
    RAISE EXCEPTION 'El sabor no tiene receta configurada';
  END IF;

  FOR v_linea IN
    SELECT insumo_id, SUM(consumo) AS consumo, MAX(nombre) AS nombre, MAX(unidad) AS unidad
    FROM (
      SELECT
        r.insumo_id,
        ROUND(r.cantidad_usada * v_factor, 6) AS consumo,
        i.nombre,
        i.unidad
      FROM public.recetas r
      INNER JOIN public.insumos i ON i.id = r.insumo_id
      WHERE r.sabor_id = p_sabor_id
      UNION ALL
      SELECT
        ri.insumo_id,
        ROUND(
          r.cantidad_usada * ri.cantidad_usada * v_factor
          / COALESCE(NULLIF(sp.rendimiento, 0), 1),
          6
        ) AS consumo,
        i.nombre,
        i.unidad
      FROM public.recetas r
      INNER JOIN public.sabores sp ON sp.id = r.preparacion_sabor_id
      INNER JOIN public.recetas ri ON ri.sabor_id = r.preparacion_sabor_id
      INNER JOIN public.insumos i ON i.id = ri.insumo_id
      WHERE r.sabor_id = p_sabor_id
    ) exp
    GROUP BY insumo_id
  LOOP
    SELECT cantidad_actual INTO v_stock
    FROM public.insumos WHERE id = v_linea.insumo_id;

    IF v_stock < v_linea.consumo THEN
      RAISE EXCEPTION 'No hay suficiente % para esta producción (necesitas % %, hay % %)',
        v_linea.nombre,
        TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM v_linea.consumo::TEXT)),
        v_linea.unidad,
        TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM v_stock::TEXT)),
        v_linea.unidad;
    END IF;
  END LOOP;

  INSERT INTO public.historial_produccion (fecha, sabor_id, cantidad)
  VALUES (COALESCE(p_fecha, CURRENT_DATE), p_sabor_id, p_cantidad)
  RETURNING id INTO v_historial_id;

  FOR v_linea IN
    SELECT insumo_id, SUM(consumo) AS consumo
    FROM (
      SELECT r.insumo_id, ROUND(r.cantidad_usada * v_factor, 6) AS consumo
      FROM public.recetas r
      WHERE r.sabor_id = p_sabor_id AND r.insumo_id IS NOT NULL
      UNION ALL
      SELECT
        ri.insumo_id,
        ROUND(
          r.cantidad_usada * ri.cantidad_usada * v_factor
          / COALESCE(NULLIF(sp.rendimiento, 0), 1),
          6
        ) AS consumo
      FROM public.recetas r
      INNER JOIN public.sabores sp ON sp.id = r.preparacion_sabor_id
      INNER JOIN public.recetas ri ON ri.sabor_id = r.preparacion_sabor_id
      WHERE r.sabor_id = p_sabor_id AND r.preparacion_sabor_id IS NOT NULL
    ) exp
    GROUP BY insumo_id
  LOOP
    UPDATE public.insumos
    SET cantidad_actual = cantidad_actual - v_linea.consumo
    WHERE id = v_linea.insumo_id;
  END LOOP;

  PERFORM public.registrar_log(
    'produccion',
    'sabor',
    p_sabor_id,
    format('Producción: %s bolis de «%s»', p_cantidad, v_nombre),
    NULL,
    jsonb_build_object('cantidad', p_cantidad, 'fecha', COALESCE(p_fecha, CURRENT_DATE)),
    v_usuario
  );

  RETURN v_historial_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_sabores_que_usan_preparacion(UUID) TO anon, authenticated;
