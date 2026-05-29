-- Recálculo automático para TODOS los sabores (como Excel)
-- Requiere haber ejecutado 011, 012 y 013 antes.

-- Quitar versión antigua de costo_linea (solo cantidad, sin medida)
DROP FUNCTION IF EXISTS public.costo_linea_insumo(NUMERIC, public.insumos);

-- Al cambiar cualquier línea de receta → recalcula ese sabor (y productos si es preparación)
CREATE OR REPLACE FUNCTION public.trg_recetas_recalcular_costo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sabor_id UUID;
  v_es_prep BOOLEAN;
BEGIN
  v_sabor_id := COALESCE(NEW.sabor_id, OLD.sabor_id);

  SELECT COALESCE(es_preparacion, false) INTO v_es_prep
  FROM public.sabores WHERE id = v_sabor_id;

  PERFORM public.recalcular_costo_sabor(v_sabor_id);

  IF v_es_prep THEN
    PERFORM public.recalcular_sabores_que_usan_preparacion(v_sabor_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS recetas_recalcular_costo ON public.recetas;
CREATE TRIGGER recetas_recalcular_costo
  AFTER INSERT OR UPDATE OR DELETE ON public.recetas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recetas_recalcular_costo();

-- Sugerencia de compras: consumo con cantidad × medida (todos los sabores)
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
  WITH consumo_directo AS (
    SELECT
      r.insumo_id,
      COALESCE(SUM(
        r.cantidad_usada
        * COALESCE(NULLIF(r.medida_usada, 0), 1)
        * (hp.cantidad / COALESCE(NULLIF(s.rendimiento, 0), 1))
      ), 0) AS consumo
    FROM public.historial_produccion hp
    INNER JOIN public.sabores s ON s.id = hp.sabor_id
    INNER JOIN public.recetas r ON r.sabor_id = hp.sabor_id AND r.insumo_id IS NOT NULL
    WHERE hp.fecha >= (CURRENT_DATE - v_dias)
      AND COALESCE(s.es_preparacion, false) = false
    GROUP BY r.insumo_id
  ),
  consumo_via_prep AS (
    SELECT
      ri.insumo_id,
      COALESCE(SUM(
        r.cantidad_usada
        * ri.cantidad_usada
        * COALESCE(NULLIF(ri.medida_usada, 0), 1)
        * (hp.cantidad / COALESCE(NULLIF(s.rendimiento, 0), 1))
        / COALESCE(NULLIF(sp.rendimiento, 0), 1)
      ), 0) AS consumo
    FROM public.historial_produccion hp
    INNER JOIN public.sabores s ON s.id = hp.sabor_id
    INNER JOIN public.recetas r ON r.sabor_id = hp.sabor_id AND r.preparacion_sabor_id IS NOT NULL
    INNER JOIN public.sabores sp ON sp.id = r.preparacion_sabor_id
    INNER JOIN public.recetas ri ON ri.sabor_id = r.preparacion_sabor_id AND ri.insumo_id IS NOT NULL
    WHERE hp.fecha >= (CURRENT_DATE - v_dias)
      AND COALESCE(s.es_preparacion, false) = false
    GROUP BY ri.insumo_id
  ),
  consumo_por_insumo AS (
    SELECT insumo_id, SUM(consumo) AS consumo_total
    FROM (
      SELECT * FROM consumo_directo
      UNION ALL
      SELECT * FROM consumo_via_prep
    ) t
    GROUP BY insumo_id
  ),
  insumos_receta AS (
    SELECT DISTINCT r.insumo_id FROM public.recetas r WHERE r.insumo_id IS NOT NULL
    UNION
    SELECT DISTINCT ri.insumo_id
    FROM public.recetas r
    INNER JOIN public.recetas ri ON ri.sabor_id = r.preparacion_sabor_id
    WHERE ri.insumo_id IS NOT NULL
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

-- Recalcular todos los sabores ahora (por si faltó en migraciones anteriores)
SELECT public.recalcular_todos_los_costos();
