-- Ledger de hielera (carga / retorno) y stock real para POS
-- Stock Real = Producción − Cargas + Retornos (por día)

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

-- Historial existente → transacciones (solo cargas)
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

CREATE OR REPLACE FUNCTION total_transaccion_hielera(
  p_fecha DATE,
  p_sabor_id UUID,
  p_tipo TEXT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
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

/** Stock disponible en almacén (POS): Producción − Carga + Retorno */
CREATE OR REPLACE FUNCTION stock_real_pos(p_fecha DATE, p_sabor_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
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
AS $$
  SELECT stock_real_pos(p_fecha, p_sabor_id);
$$;

-- ─── Cargar hielera (registra transacción + stock del día) ───────────────────

CREATE OR REPLACE FUNCTION cargar_hielera(
  p_fecha DATE,
  p_lineas JSONB,
  p_vendedora_id UUID DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linea JSONB;
  v_sabor_id UUID;
  v_cantidad INTEGER;
  v_disponible INTEGER;
BEGIN
  IF p_lineas IS NULL OR jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'No hay líneas para cargar en la hielera';
  END IF;

  FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_sabor_id := (v_linea->>'sabor_id')::UUID;
    v_cantidad := COALESCE((v_linea->>'cantidad')::INTEGER, 0);

    IF v_cantidad <= 0 THEN
      CONTINUE;
    END IF;

    v_disponible := stock_real_pos(p_fecha, v_sabor_id);

    IF v_cantidad > v_disponible THEN
      RAISE EXCEPTION 'Stock insuficiente en almacén para el sabor % (disponible: %, solicitado: %)',
        v_sabor_id, v_disponible, v_cantidad;
    END IF;

    INSERT INTO transacciones_hielera (tipo, sabor_id, cantidad, fecha)
    VALUES ('carga', v_sabor_id, v_cantidad, p_fecha);

    INSERT INTO hielera_cargas (fecha, sabor_id, cantidad, vendedora_id, notas)
    VALUES (p_fecha, v_sabor_id, v_cantidad, p_vendedora_id, p_notas);

    INSERT INTO hielera_stock_dia (fecha, sabor_id, cantidad, updated_at)
    VALUES (p_fecha, v_sabor_id, v_cantidad, NOW())
    ON CONFLICT (fecha, sabor_id)
    DO UPDATE SET
      cantidad = hielera_stock_dia.cantidad + EXCLUDED.cantidad,
      updated_at = NOW();
  END LOOP;
END;
$$;

-- ─── Cierre: sobrantes de hielera → almacén ─────────────────────────────────

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

-- Vista POS: stock_almacen usa stock_real_pos (mismas columnas que 028)
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

GRANT SELECT ON inventario_pos_hielera TO anon, authenticated;

-- Auto-carga en venta también registra transacción tipo carga
CREATE OR REPLACE FUNCTION registrar_venta_ticket(
  p_fecha DATE,
  p_lineas JSONB,
  p_vendedora_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id UUID;
  v_linea JSONB;
  v_sabor_id UUID;
  v_cantidad INTEGER;
  v_en_hielera INTEGER;
  v_falta INTEGER;
  v_almacen INTEGER;
  v_precio NUMERIC(12, 2);
  v_costo NUMERIC(12, 2);
  v_total NUMERIC(12, 2) := 0;
BEGIN
  IF p_lineas IS NULL OR jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'El ticket está vacío';
  END IF;

  INSERT INTO ventas_ticket (fecha, vendedora_id, total_ingreso)
  VALUES (p_fecha, p_vendedora_id, 0)
  RETURNING id INTO v_ticket_id;

  FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_sabor_id := (v_linea->>'sabor_id')::UUID;
    v_cantidad := COALESCE((v_linea->>'cantidad')::INTEGER, 0);

    IF v_cantidad <= 0 THEN
      CONTINUE;
    END IF;

    v_en_hielera := stock_hielera(p_fecha, v_sabor_id);

    IF v_cantidad > v_en_hielera THEN
      v_falta := v_cantidad - v_en_hielera;
      v_almacen := stock_real_pos(p_fecha, v_sabor_id);

      IF v_falta > v_almacen THEN
        RAISE EXCEPTION 'Stock insuficiente (sabor %, hielera: %, almacén: %, solicitado: %)',
          v_sabor_id, v_en_hielera, v_almacen, v_cantidad;
      END IF;

      INSERT INTO transacciones_hielera (tipo, sabor_id, cantidad, fecha)
      VALUES ('carga', v_sabor_id, v_falta, p_fecha);

      INSERT INTO hielera_cargas (fecha, sabor_id, cantidad, vendedora_id, notas)
      VALUES (p_fecha, v_sabor_id, v_falta, p_vendedora_id, 'Auto-carga al registrar venta');

      INSERT INTO hielera_stock_dia (fecha, sabor_id, cantidad, updated_at)
      VALUES (p_fecha, v_sabor_id, v_falta, NOW())
      ON CONFLICT (fecha, sabor_id)
      DO UPDATE SET
        cantidad = hielera_stock_dia.cantidad + EXCLUDED.cantidad,
        updated_at = NOW();

      v_en_hielera := stock_hielera(p_fecha, v_sabor_id);
    END IF;

    IF v_cantidad > v_en_hielera THEN
      RAISE EXCEPTION 'Stock insuficiente en hielera tras auto-carga';
    END IF;

    SELECT precio_venta, COALESCE(costo_produccion_unitario, 0)
    INTO v_precio, v_costo
    FROM sabores
    WHERE id = v_sabor_id;

    IF v_precio IS NULL THEN
      RAISE EXCEPTION 'Sabor no encontrado: %', v_sabor_id;
    END IF;

    INSERT INTO detalle_ventas (
      ticket_id, sabor_id, cantidad, precio_venta_unitario, costo_produccion_unitario
    )
    VALUES (v_ticket_id, v_sabor_id, v_cantidad, v_precio, v_costo);

    INSERT INTO ventas (
      fecha, sabor_id, cantidad, vendedora_id,
      precio_venta_unitario, costo_produccion_unitario, ticket_id
    )
    VALUES (p_fecha, v_sabor_id, v_cantidad, p_vendedora_id, v_precio, v_costo, v_ticket_id);

    UPDATE hielera_stock_dia
    SET cantidad = cantidad - v_cantidad, updated_at = NOW()
    WHERE fecha = p_fecha AND sabor_id = v_sabor_id;

    v_total := v_total + (v_precio * v_cantidad);
  END LOOP;

  UPDATE ventas_ticket SET total_ingreso = v_total WHERE id = v_ticket_id;
  RETURN v_ticket_id;
END;
$$;

GRANT SELECT, INSERT ON transacciones_hielera TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_retorno TO authenticated;
GRANT EXECUTE ON FUNCTION stock_real_pos TO authenticated;
GRANT EXECUTE ON FUNCTION total_transaccion_hielera TO authenticated;
