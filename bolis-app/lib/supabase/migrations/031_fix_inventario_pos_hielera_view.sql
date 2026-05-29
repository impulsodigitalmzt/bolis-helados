-- Completar migración 030 si falló antes de crear funciones/vista.
-- Ejecutar TODO este archivo en Supabase SQL Editor (en orden, de arriba a abajo).

-- 1) Tabla ledger
CREATE TABLE IF NOT EXISTS transacciones_hielera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('carga', 'retorno')),
  sabor_id UUID NOT NULL REFERENCES sabores(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transacciones_hielera_fecha
  ON transacciones_hielera(fecha);
CREATE INDEX IF NOT EXISTS idx_transacciones_hielera_sabor_fecha
  ON transacciones_hielera(sabor_id, fecha);

-- 2) Backfill cargas históricas (idempotente)
INSERT INTO transacciones_hielera (tipo, sabor_id, cantidad, fecha, created_at)
SELECT 'carga', c.sabor_id, c.cantidad, c.fecha, c.created_at
FROM hielera_cargas c
WHERE NOT EXISTS (
  SELECT 1 FROM transacciones_hielera t
  WHERE t.tipo = 'carga'
    AND t.sabor_id = c.sabor_id
    AND t.fecha = c.fecha
    AND t.cantidad = c.cantidad
    AND t.created_at = c.created_at
);

-- 3) Funciones de stock (requieren 028: stock_produccion_disponible, stock_hielera)
CREATE OR REPLACE FUNCTION total_transaccion_hielera(
  p_fecha DATE,
  p_sabor_id UUID,
  p_tipo TEXT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT SUM(cantidad)::INTEGER
      FROM transacciones_hielera
      WHERE fecha = p_fecha
        AND sabor_id = p_sabor_id
        AND tipo = p_tipo
    ),
    0
  );
$$;

CREATE OR REPLACE FUNCTION stock_real_pos(p_fecha DATE, p_sabor_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    stock_produccion_disponible(p_sabor_id)
      - total_transaccion_hielera(p_fecha, p_sabor_id, 'carga')
      + total_transaccion_hielera(p_fecha, p_sabor_id, 'retorno')
  );
$$;

CREATE OR REPLACE FUNCTION stock_almacen_disponible(p_fecha DATE, p_sabor_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT stock_real_pos(p_fecha, p_sabor_id);
$$;

-- 4) Cierre de jornada
CREATE OR REPLACE FUNCTION registrar_retorno(
  p_sabor_id UUID,
  p_cantidad_sobrante INTEGER,
  p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_en_hielera INTEGER;
BEGIN
  IF p_cantidad_sobrante IS NULL OR p_cantidad_sobrante <= 0 THEN
    RAISE EXCEPTION 'La cantidad de sobrante debe ser mayor que cero';
  END IF;

  v_en_hielera := stock_hielera(p_fecha, p_sabor_id);

  IF p_cantidad_sobrante > v_en_hielera THEN
    RAISE EXCEPTION 'Sobrante mayor al stock en hielera (en hielera: %, sobrante: %)',
      v_en_hielera, p_cantidad_sobrante;
  END IF;

  INSERT INTO transacciones_hielera (tipo, sabor_id, cantidad, fecha)
  VALUES ('retorno', p_sabor_id, p_cantidad_sobrante, p_fecha);

  UPDATE hielera_stock_dia
  SET
    cantidad = cantidad - p_cantidad_sobrante,
    updated_at = NOW()
  WHERE fecha = p_fecha AND sabor_id = p_sabor_id;
END;
$$;

-- 5) Vista (DROP + CREATE; no usar CREATE OR REPLACE con columnas nuevas)
DROP VIEW IF EXISTS inventario_pos_hielera;

CREATE VIEW inventario_pos_hielera AS
SELECT
  s.id AS sabor_id,
  s.nombre AS sabor_nombre,
  s.tipo,
  s.precio_venta,
  s.costo_produccion_unitario,
  s.es_preparacion,
  stock_produccion_disponible(s.id) AS stock_produccion,
  stock_hielera(CURRENT_DATE, s.id) AS stock_hielera,
  stock_real_pos(CURRENT_DATE, s.id) AS stock_almacen,
  COALESCE(ipt.total_producido, 0) AS total_producido,
  COALESCE(ipt.total_vendido, 0) AS total_vendido
FROM sabores s
LEFT JOIN inventario_producto_terminado ipt ON ipt.sabor_id = s.id
WHERE COALESCE(s.es_preparacion, false) = false;

-- 6) Permisos
GRANT SELECT, INSERT ON transacciones_hielera TO authenticated;
GRANT EXECUTE ON FUNCTION total_transaccion_hielera TO authenticated;
GRANT EXECUTE ON FUNCTION stock_real_pos TO authenticated;
GRANT EXECUTE ON FUNCTION stock_almacen_disponible TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_retorno TO authenticated;
GRANT SELECT ON inventario_pos_hielera TO anon, authenticated;
