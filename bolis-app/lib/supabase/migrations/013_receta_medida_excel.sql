-- Columna MEDIDA del Excel + fórmula: cantidad × medida ÷ tamano_paquete × precio

ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS medida_usada NUMERIC(14, 6) NOT NULL DEFAULT 1
    CHECK (medida_usada > 0);

CREATE OR REPLACE FUNCTION public.costo_linea_insumo(
  p_cantidad_usada NUMERIC,
  p_medida_usada NUMERIC,
  i public.insumos
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT ROUND(
    p_cantidad_usada
    * (public.precio_efectivo_insumo(i) / COALESCE(NULLIF(i.tamano_paquete, 0), 1))
    * COALESCE(NULLIF(p_medida_usada, 0), 1),
    4
  );
$$;

-- Tamaños de paquete alineados con MEDIDA del Excel (denominador en gramos/ml)
UPDATE public.insumos SET tamano_paquete = 1000
  WHERE lower(trim(nombre)) LIKE '%azúcar%'
     OR lower(trim(nombre)) LIKE '%azucar%';

UPDATE public.insumos SET tamano_paquete = 1500
  WHERE lower(trim(nombre)) LIKE '%leche entera%';

UPDATE public.insumos SET tamano_paquete = 1000
  WHERE lower(trim(nombre)) = 'mango'
   OR lower(trim(nombre)) LIKE 'mango %';

-- Bolsas: si el precio en insumos es por kg ($119), la receta usa ~$1.39/bolsa.
-- Pon precio ≈ 1.39 y tamano_paquete = 1 en Insumos, o cantidad en gramos (12×11.7).

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
    SELECT public.costo_linea_insumo(
      r.cantidad_usada, r.medida_usada, i
    ) AS costo_linea
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
  v_medida NUMERIC(14, 6);
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

    v_medida := COALESCE((elem->>'medida_usada')::NUMERIC, 1);
    IF v_medida <= 0 THEN
      v_medida := 1;
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

      INSERT INTO public.recetas (
        sabor_id, preparacion_sabor_id, cantidad_usada, medida_usada
      )
      VALUES (
        p_sabor_id, v_prep_id,
        (elem->>'cantidad_usada')::NUMERIC,
        v_medida
      );
    ELSIF elem->>'insumo_id' IS NOT NULL THEN
      INSERT INTO public.recetas (
        sabor_id, insumo_id, cantidad_usada, medida_usada
      )
      VALUES (
        p_sabor_id,
        (elem->>'insumo_id')::UUID,
        (elem->>'cantidad_usada')::NUMERIC,
        v_medida
      );
    END IF;
  END LOOP;

  PERFORM public.recalcular_costo_sabor(p_sabor_id);

  IF v_es_prep THEN
    PERFORM public.recalcular_sabores_que_usan_preparacion(p_sabor_id);
  END IF;
END;
$$;

DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN
    SELECT id FROM public.sabores WHERE COALESCE(es_preparacion, false) = true ORDER BY nombre
  LOOP
    PERFORM public.recalcular_costo_sabor(s.id);
  END LOOP;

  FOR s IN
    SELECT id FROM public.sabores WHERE COALESCE(es_preparacion, false) = false ORDER BY nombre
  LOOP
    PERFORM public.recalcular_costo_sabor(s.id);
  END LOOP;
END $$;

-- Producción: descontar cantidad × medida del stock
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
        ROUND(
          r.cantidad_usada * COALESCE(NULLIF(r.medida_usada, 0), 1) * v_factor,
          6
        ) AS consumo,
        i.nombre,
        i.unidad
      FROM public.recetas r
      INNER JOIN public.insumos i ON i.id = r.insumo_id
      WHERE r.sabor_id = p_sabor_id
      UNION ALL
      SELECT
        ri.insumo_id,
        ROUND(
          r.cantidad_usada * ri.cantidad_usada
            * COALESCE(NULLIF(ri.medida_usada, 0), 1)
            * v_factor
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
      SELECT
        r.insumo_id,
        ROUND(
          r.cantidad_usada * COALESCE(NULLIF(r.medida_usada, 0), 1) * v_factor,
          6
        ) AS consumo
      FROM public.recetas r
      WHERE r.sabor_id = p_sabor_id AND r.insumo_id IS NOT NULL
      UNION ALL
      SELECT
        ri.insumo_id,
        ROUND(
          r.cantidad_usada * ri.cantidad_usada
            * COALESCE(NULLIF(ri.medida_usada, 0), 1)
            * v_factor
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
