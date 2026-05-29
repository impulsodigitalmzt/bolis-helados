-- Ventas POS: costos históricos en ventas + inventario terminado + vistas financieras
-- Ejecutar en Supabase → SQL Editor (después de 004_historial_produccion_inventario.sql)

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS precio_venta_unitario NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS costo_produccion_unitario NUMERIC(12, 4);

-- Rellenar ventas existentes con precios del sabor al momento de migrar
UPDATE public.ventas v
SET
  precio_venta_unitario = s.precio_venta,
  costo_produccion_unitario = s.costo_produccion_unitario
FROM public.sabores s
WHERE v.sabor_id = s.id
  AND (v.precio_venta_unitario IS NULL OR v.costo_produccion_unitario IS NULL);

ALTER TABLE public.ventas
  ALTER COLUMN precio_venta_unitario SET NOT NULL,
  ALTER COLUMN costo_produccion_unitario SET NOT NULL;

-- POS sin vendedora asignada (comisión 0)
ALTER TABLE public.ventas
  ALTER COLUMN vendedora_id DROP NOT NULL;

-- Stock disponible = producción acumulada − ventas acumuladas
CREATE OR REPLACE FUNCTION public.stock_producto_terminado(p_sabor_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT SUM(h.cantidad)
      FROM public.historial_produccion h
      WHERE h.sabor_id = p_sabor_id
    ), 0)
    - COALESCE((
      SELECT SUM(v.cantidad)
      FROM public.ventas v
      WHERE v.sabor_id = p_sabor_id
    ), 0);
$$;

-- Recrear vistas (CREATE OR REPLACE no permite cambiar nombres de columnas)
DROP VIEW IF EXISTS public.vista_resumen_ventas CASCADE;
DROP VIEW IF EXISTS public.vista_reporte_ventas CASCADE;
DROP VIEW IF EXISTS public.reporte_utilidad_mensual CASCADE;
DROP VIEW IF EXISTS public.inventario_producto_terminado CASCADE;

CREATE VIEW public.inventario_producto_terminado AS
SELECT
  s.id AS sabor_id,
  s.nombre AS sabor_nombre,
  s.tipo,
  s.precio_venta,
  COALESCE(p.producido, 0) AS total_producido,
  COALESCE(v.vendido, 0) AS total_vendido,
  public.stock_producto_terminado(s.id) AS stock_disponible
FROM public.sabores s
LEFT JOIN (
  SELECT sabor_id, SUM(cantidad) AS producido
  FROM public.historial_produccion
  GROUP BY sabor_id
) p ON p.sabor_id = s.id
LEFT JOIN (
  SELECT sabor_id, SUM(cantidad) AS vendido
  FROM public.ventas
  GROUP BY sabor_id
) v ON v.sabor_id = s.id;

-- Utilidad mensual (costos históricos guardados en cada venta)
CREATE VIEW public.reporte_utilidad_mensual AS
SELECT
  DATE_TRUNC('month', fecha)::date AS mes,
  TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS periodo,
  SUM(cantidad * precio_venta_unitario) AS ingresos_totales,
  SUM(cantidad * costo_produccion_unitario) AS costos_totales,
  SUM(cantidad * precio_venta_unitario)
    - SUM(cantidad * costo_produccion_unitario) AS utilidad_bruta,
  SUM(cantidad) AS bolis_vendidos
FROM public.ventas
GROUP BY DATE_TRUNC('month', fecha)
ORDER BY mes DESC;

-- Reporte por venta usando snapshots (no el costo actual del sabor)
CREATE VIEW public.vista_reporte_ventas AS
SELECT
  v.id AS venta_id,
  v.fecha,
  v.cantidad,
  s.id AS sabor_id,
  s.nombre AS sabor_nombre,
  v.vendedora_id,
  COALESCE(vd.nombre, 'POS') AS vendedora_nombre,
  v.precio_venta_unitario AS precio_venta,
  v.costo_produccion_unitario,
  (v.cantidad * v.precio_venta_unitario) AS ingreso,
  (v.cantidad * v.costo_produccion_unitario) AS costo_produccion,
  (v.cantidad * COALESCE(vd.comision_por_boli, 0)) AS comision,
  (v.cantidad * v.precio_venta_unitario)
    - (v.cantidad * v.costo_produccion_unitario)
    - (v.cantidad * COALESCE(vd.comision_por_boli, 0)) AS ganancia_neta
FROM public.ventas v
INNER JOIN public.sabores s ON s.id = v.sabor_id
LEFT JOIN public.vendedoras vd ON vd.id = v.vendedora_id;

-- Alias por compatibilidad con código o vistas antiguas
CREATE VIEW public.vista_resumen_ventas AS
SELECT * FROM public.vista_reporte_ventas;

-- Transacción: validar stock, registrar venta con costos históricos
CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_sabor_id UUID,
  p_cantidad NUMERIC DEFAULT 1,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_vendedora_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id UUID;
  v_stock NUMERIC(12, 4);
  v_precio NUMERIC(12, 4);
  v_costo NUMERIC(12, 4);
  v_nombre TEXT;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad vendida debe ser mayor a 0';
  END IF;

  SELECT nombre, precio_venta, costo_produccion_unitario
  INTO v_nombre, v_precio, v_costo
  FROM public.sabores
  WHERE id = p_sabor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sabor no encontrado';
  END IF;

  v_stock := public.stock_producto_terminado(p_sabor_id);

  IF v_stock < p_cantidad THEN
    RAISE EXCEPTION 'No hay suficiente inventario de % para esta venta (disponibles: %, solicitados: %)',
      v_nombre,
      TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM v_stock::TEXT)),
      TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM p_cantidad::TEXT));
  END IF;

  INSERT INTO public.ventas (
    fecha,
    sabor_id,
    vendedora_id,
    cantidad,
    precio_venta_unitario,
    costo_produccion_unitario
  )
  VALUES (
    COALESCE(p_fecha, CURRENT_DATE),
    p_sabor_id,
    p_vendedora_id,
    p_cantidad,
    v_precio,
    v_costo
  )
  RETURNING id INTO v_venta_id;

  RETURN v_venta_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_venta(UUID, NUMERIC, DATE, UUID)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.stock_producto_terminado(UUID)
  TO anon, authenticated;
