-- Compra inteligente, precios dinámicos, log de auditoría
-- Ejecutar en Supabase → SQL Editor (después de 006_config_modalidad_negocio.sql)

-- 1. Histórico de precios de insumos
CREATE TABLE IF NOT EXISTS public.historial_precios_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES public.insumos (id) ON DELETE CASCADE,
  precio_anterior NUMERIC(12, 4),
  precio_nuevo NUMERIC(12, 4) NOT NULL CHECK (precio_nuevo >= 0),
  cantidad_comprada NUMERIC(14, 6) NOT NULL DEFAULT 0 CHECK (cantidad_comprada >= 0),
  notas TEXT,
  usuario TEXT NOT NULL DEFAULT 'app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_precios_insumo
  ON public.historial_precios_insumos (insumo_id, created_at DESC);

-- 2. Log de auditoría del sistema
CREATE TABLE IF NOT EXISTS public.logs_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id UUID,
  descripcion TEXT NOT NULL,
  valor_anterior JSONB,
  valor_nuevo JSONB,
  usuario TEXT NOT NULL DEFAULT 'app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_sistema_created
  ON public.logs_sistema (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_sistema_entidad
  ON public.logs_sistema (entidad, entidad_id);

-- 3. Helper: registrar evento en log
CREATE OR REPLACE FUNCTION public.registrar_log(
  p_tipo_accion TEXT,
  p_entidad TEXT,
  p_entidad_id UUID,
  p_descripcion TEXT,
  p_valor_anterior JSONB DEFAULT NULL,
  p_valor_nuevo JSONB DEFAULT NULL,
  p_usuario TEXT DEFAULT 'app'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.logs_sistema (
    tipo_accion, entidad, entidad_id, descripcion,
    valor_anterior, valor_nuevo, usuario
  )
  VALUES (
    p_tipo_accion, p_entidad, p_entidad_id, p_descripcion,
    p_valor_anterior, p_valor_nuevo, COALESCE(NULLIF(TRIM(p_usuario), ''), 'app')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4. Sugerencia de compra según producción últimos N días
CREATE OR REPLACE FUNCTION public.calcular_sugerencia_compra(
  p_dias_analisis INT DEFAULT 30,
  p_dias_proyeccion INT DEFAULT 7
)
RETURNS TABLE (
  insumo_id UUID,
  insumo_nombre TEXT,
  unidad TEXT,
  stock_actual NUMERIC,
  consumo_total_periodo NUMERIC,
  consumo_diario_promedio NUMERIC,
  consumo_proyectado NUMERIC,
  stock_proyectado NUMERIC,
  cantidad_sugerida NUMERIC,
  urgencia TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias INT := GREATEST(COALESCE(p_dias_analisis, 30), 1);
  v_horizonte INT := GREATEST(COALESCE(p_dias_proyeccion, 7), 1);
BEGIN
  RETURN QUERY
  WITH consumo_por_insumo AS (
    SELECT
      r.insumo_id,
      COALESCE(SUM(
        r.cantidad_usada * (hp.cantidad / COALESCE(NULLIF(s.rendimiento, 0), 1))
      ), 0) AS consumo_total
    FROM public.historial_produccion hp
    INNER JOIN public.sabores s ON s.id = hp.sabor_id
    INNER JOIN public.recetas r ON r.sabor_id = hp.sabor_id
    WHERE hp.fecha >= (CURRENT_DATE - v_dias)
    GROUP BY r.insumo_id
  ),
  insumos_receta AS (
    SELECT DISTINCT r.insumo_id FROM public.recetas r
  )
  SELECT
    i.id,
    i.nombre,
    i.unidad,
    i.cantidad_actual,
    COALESCE(c.consumo_total, 0),
    ROUND(COALESCE(c.consumo_total, 0) / v_dias, 6),
    ROUND((COALESCE(c.consumo_total, 0) / v_dias) * v_horizonte, 6),
    ROUND(i.cantidad_actual - ((COALESCE(c.consumo_total, 0) / v_dias) * v_horizonte), 6),
    ROUND(GREATEST(
      ((COALESCE(c.consumo_total, 0) / v_dias) * v_horizonte) - i.cantidad_actual,
      0
    ), 6),
    CASE
      WHEN COALESCE(c.consumo_total, 0) = 0 THEN 'sin_ritmo'
      WHEN i.cantidad_actual <= 0 THEN 'critico'
      WHEN i.cantidad_actual < (COALESCE(c.consumo_total, 0) / v_dias) * v_horizonte THEN 'alerta'
      ELSE 'ok'
    END
  FROM public.insumos i
  INNER JOIN insumos_receta ir ON ir.insumo_id = i.id
  LEFT JOIN consumo_por_insumo c ON c.insumo_id = i.id
  ORDER BY
    CASE
      WHEN COALESCE(c.consumo_total, 0) > 0 AND i.cantidad_actual <= 0 THEN 0
      WHEN i.cantidad_actual < (COALESCE(c.consumo_total, 0) / v_dias) * v_horizonte THEN 1
      ELSE 2
    END,
    GREATEST(
      ((COALESCE(c.consumo_total, 0) / v_dias) * v_horizonte) - i.cantidad_actual,
      0
    ) DESC,
    i.nombre;
END;
$$;

-- 5. Compra de insumo: precio + stock + histórico + log + recálculo recetas (trigger precio)
CREATE OR REPLACE FUNCTION public.registrar_compra_insumo(
  p_insumo_id UUID,
  p_precio_nuevo NUMERIC,
  p_cantidad_agregada NUMERIC DEFAULT 0,
  p_notas TEXT DEFAULT NULL,
  p_usuario TEXT DEFAULT 'app'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hist_id UUID;
  v_precio_anterior NUMERIC(12, 4);
  v_stock_anterior NUMERIC(14, 6);
  v_nombre TEXT;
  v_usuario TEXT := COALESCE(NULLIF(TRIM(p_usuario), ''), 'app');
BEGIN
  IF p_precio_nuevo IS NULL OR p_precio_nuevo < 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor o igual a 0';
  END IF;

  IF p_cantidad_agregada IS NULL OR p_cantidad_agregada < 0 THEN
    RAISE EXCEPTION 'La cantidad comprada debe ser mayor o igual a 0';
  END IF;

  SELECT nombre, precio, cantidad_actual
  INTO v_nombre, v_precio_anterior, v_stock_anterior
  FROM public.insumos
  WHERE id = p_insumo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado';
  END IF;

  UPDATE public.insumos
  SET
    precio = p_precio_nuevo,
    cantidad_actual = cantidad_actual + p_cantidad_agregada
  WHERE id = p_insumo_id;

  INSERT INTO public.historial_precios_insumos (
    insumo_id, precio_anterior, precio_nuevo,
    cantidad_comprada, notas, usuario
  )
  VALUES (
    p_insumo_id, v_precio_anterior, p_precio_nuevo,
    p_cantidad_agregada, p_notas, v_usuario
  )
  RETURNING id INTO v_hist_id;

  PERFORM public.registrar_log(
    'compra_insumo',
    'insumo',
    p_insumo_id,
    format('Compra registrada: %s', v_nombre),
    jsonb_build_object(
      'precio', v_precio_anterior,
      'stock', v_stock_anterior
    ),
    jsonb_build_object(
      'precio', p_precio_nuevo,
      'stock', v_stock_anterior + p_cantidad_agregada,
      'cantidad_comprada', p_cantidad_agregada
    ),
    v_usuario
  );

  RETURN v_hist_id;
END;
$$;

-- 6. Auditoría en cambios de insumos (precio/stock/oferta)
ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS en_oferta BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(12, 4);

CREATE OR REPLACE FUNCTION public.trg_insumos_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.precio IS DISTINCT FROM NEW.precio
      OR OLD.cantidad_actual IS DISTINCT FROM NEW.cantidad_actual
      OR OLD.en_oferta IS DISTINCT FROM NEW.en_oferta
      OR OLD.precio_oferta IS DISTINCT FROM NEW.precio_oferta
    THEN
      IF OLD.precio IS DISTINCT FROM NEW.precio
        AND OLD.cantidad_actual IS NOT DISTINCT FROM NEW.cantidad_actual
      THEN
        INSERT INTO public.historial_precios_insumos (
          insumo_id, precio_anterior, precio_nuevo, cantidad_comprada, notas, usuario
        )
        VALUES (
          NEW.id, OLD.precio, NEW.precio, 0,
          'Actualización manual de precio', 'sistema'
        );
      END IF;

      PERFORM public.registrar_log(
        'actualizacion_insumo',
        'insumo',
        NEW.id,
        format('Cambio en insumo «%s»', NEW.nombre),
        jsonb_build_object(
          'precio', OLD.precio,
          'stock', OLD.cantidad_actual,
          'en_oferta', OLD.en_oferta,
          'precio_oferta', OLD.precio_oferta
        ),
        jsonb_build_object(
          'precio', NEW.precio,
          'stock', NEW.cantidad_actual,
          'en_oferta', NEW.en_oferta,
          'precio_oferta', NEW.precio_oferta
        ),
        'sistema'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insumos_audit_log ON public.insumos;
CREATE TRIGGER insumos_audit_log
  AFTER UPDATE ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_insumos_audit_log();

-- 7. Extender registrar_produccion con log
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
  v_receta RECORD;
  v_consumo NUMERIC(14, 6);
  v_stock NUMERIC(14, 6);
  v_nombre TEXT;
  v_usuario TEXT := COALESCE(NULLIF(TRIM(p_usuario), ''), 'app');
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a 0';
  END IF;

  SELECT nombre, rendimiento INTO v_nombre, v_rendimiento
  FROM public.sabores WHERE id = p_sabor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sabor no encontrado';
  END IF;

  v_rendimiento := COALESCE(NULLIF(v_rendimiento, 0), 1);
  v_factor := p_cantidad / v_rendimiento;

  IF NOT EXISTS (SELECT 1 FROM public.recetas WHERE sabor_id = p_sabor_id) THEN
    RAISE EXCEPTION 'El sabor no tiene receta configurada';
  END IF;

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
    FROM public.recetas r WHERE r.sabor_id = p_sabor_id
  LOOP
    v_consumo := ROUND(v_receta.cantidad_usada * v_factor, 6);
    UPDATE public.insumos
    SET cantidad_actual = cantidad_actual - v_consumo
    WHERE id = v_receta.insumo_id;
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

-- 8. Extender guardar_receta_sabor con log
CREATE OR REPLACE FUNCTION public.guardar_receta_sabor(
  p_sabor_id UUID,
  p_nombre TEXT,
  p_rendimiento NUMERIC,
  p_lineas JSONB,
  p_usuario TEXT DEFAULT 'app'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre_anterior TEXT;
  v_rendimiento_anterior NUMERIC;
  v_lineas_antes INT;
  v_usuario TEXT := COALESCE(NULLIF(TRIM(p_usuario), ''), 'app');
BEGIN
  IF TRIM(p_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre del sabor es obligatorio';
  END IF;

  IF p_rendimiento IS NULL OR p_rendimiento <= 0 THEN
    RAISE EXCEPTION 'El rendimiento debe ser mayor a 0';
  END IF;

  SELECT nombre, rendimiento INTO v_nombre_anterior, v_rendimiento_anterior
  FROM public.sabores WHERE id = p_sabor_id;

  SELECT COUNT(*) INTO v_lineas_antes
  FROM public.recetas WHERE sabor_id = p_sabor_id;

  UPDATE public.sabores
  SET nombre = TRIM(p_nombre), rendimiento = p_rendimiento
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

  PERFORM public.registrar_log(
    'receta_actualizada',
    'sabor',
    p_sabor_id,
    format('Receta actualizada: «%s»', TRIM(p_nombre)),
    jsonb_build_object(
      'nombre', v_nombre_anterior,
      'rendimiento', v_rendimiento_anterior,
      'lineas', v_lineas_antes
    ),
    jsonb_build_object(
      'nombre', TRIM(p_nombre),
      'rendimiento', p_rendimiento,
      'lineas', jsonb_array_length(COALESCE(p_lineas, '[]'::jsonb))
    ),
    v_usuario
  );
END;
$$;

-- 9. Auditoría config negocio
CREATE OR REPLACE FUNCTION public.trg_config_negocio_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.registrar_log(
    'config_negocio',
    'config_negocio',
    NULL,
    format('Modalidad cambiada a %s', NEW.modalidad),
    jsonb_build_object(
      'modalidad', OLD.modalidad,
      'costo_oportunidad_casa', OLD.costo_oportunidad_casa,
      'renta', OLD.renta,
      'luz', OLD.luz,
      'gas', OLD.gas,
      'internet', OLD.internet,
      'otros_servicios', OLD.otros_servicios
    ),
    jsonb_build_object(
      'modalidad', NEW.modalidad,
      'costo_oportunidad_casa', NEW.costo_oportunidad_casa,
      'renta', NEW.renta,
      'luz', NEW.luz,
      'gas', NEW.gas,
      'internet', NEW.internet,
      'otros_servicios', NEW.otros_servicios
    ),
    'sistema'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS config_negocio_audit ON public.config_negocio;
CREATE TRIGGER config_negocio_audit
  AFTER UPDATE ON public.config_negocio
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION public.trg_config_negocio_audit();

-- RLS
ALTER TABLE public.historial_precios_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_precios_anon_all" ON public.historial_precios_insumos;
CREATE POLICY "historial_precios_anon_all" ON public.historial_precios_insumos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "logs_sistema_anon_all" ON public.logs_sistema;
CREATE POLICY "logs_sistema_anon_all" ON public.logs_sistema
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT EXECUTE ON FUNCTION public.registrar_log TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_sugerencia_compra(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_compra_insumo(UUID, NUMERIC, NUMERIC, TEXT, TEXT) TO anon, authenticated;
