-- Inventario doble: almacén (producción) + hielera (carga diaria)
-- Ventas desde hielera con ticket + detalle (mantiene filas en ventas para reportes)

-- ─── Tablas ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hielera_stock_dia (
  fecha DATE NOT NULL,
  sabor_id UUID NOT NULL REFERENCES sabores(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fecha, sabor_id)
);

CREATE TABLE IF NOT EXISTS hielera_cargas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  sabor_id UUID NOT NULL REFERENCES sabores(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  vendedora_id UUID REFERENCES vendedoras(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ventas_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  vendedora_id UUID REFERENCES vendedoras(id) ON DELETE SET NULL,
  total_ingreso NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES ventas_ticket(id) ON DELETE CASCADE,
  sabor_id UUID NOT NULL REFERENCES sabores(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_venta_unitario NUMERIC(12, 2) NOT NULL,
  costo_produccion_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hielera_cargas_fecha ON hielera_cargas(fecha);
CREATE INDEX IF NOT EXISTS idx_hielera_stock_fecha ON hielera_stock_dia(fecha);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_ticket ON detalle_ventas(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ventas_ticket_fecha ON ventas_ticket(fecha);

-- ─── Helpers de stock ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION stock_hielera(p_fecha DATE, p_sabor_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT cantidad FROM hielera_stock_dia WHERE fecha = p_fecha AND sabor_id = p_sabor_id),
    0
  );
$$;

CREATE OR REPLACE FUNCTION stock_produccion_disponible(p_sabor_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  SELECT COALESCE(stock_disponible, 0)::INTEGER
  INTO v_stock
  FROM inventario_producto_terminado
  WHERE sabor_id = p_sabor_id;

  IF v_stock IS NULL THEN
    BEGIN
      v_stock := COALESCE(stock_producto_terminado(p_sabor_id), 0)::INTEGER;
    EXCEPTION
      WHEN undefined_function THEN
        v_stock := 0;
    END;
  END IF;

  RETURN GREATEST(0, v_stock);
END;
$$;

/** Bolis en almacén que aún no están cargados en la hielera del día */
CREATE OR REPLACE FUNCTION stock_almacen_disponible(p_fecha DATE, p_sabor_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(
    0,
    stock_produccion_disponible(p_sabor_id) - stock_hielera(p_fecha, p_sabor_id)
  );
$$;

-- ─── Cargar hielera (traslado almacén → hielera) ───────────────────────────

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

    v_disponible := stock_almacen_disponible(p_fecha, v_sabor_id);

    IF v_cantidad > v_disponible THEN
      RAISE EXCEPTION 'Stock insuficiente en almacén para el sabor % (disponible: %, solicitado: %)',
        v_sabor_id, v_disponible, v_cantidad;
    END IF;

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

-- ─── Registrar venta (ticket + detalle + ventas legacy + resta hielera) ───

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
  v_precio NUMERIC(12, 2);
  v_costo NUMERIC(12, 2);
  v_total NUMERIC(12, 2) := 0;
  v_venta_id UUID;
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
      RAISE EXCEPTION 'Stock insuficiente en hielera (sabor %, en hielera: %, solicitado: %)',
        v_sabor_id, v_en_hielera, v_cantidad;
    END IF;

    SELECT precio_venta, COALESCE(costo_produccion_unitario, 0)
    INTO v_precio, v_costo
    FROM sabores
    WHERE id = v_sabor_id;

    IF v_precio IS NULL THEN
      RAISE EXCEPTION 'Sabor no encontrado: %', v_sabor_id;
    END IF;

    INSERT INTO detalle_ventas (
      ticket_id,
      sabor_id,
      cantidad,
      precio_venta_unitario,
      costo_produccion_unitario
    )
    VALUES (v_ticket_id, v_sabor_id, v_cantidad, v_precio, v_costo);

    INSERT INTO ventas (
      fecha,
      sabor_id,
      cantidad,
      vendedora_id,
      precio_venta_unitario,
      costo_produccion_unitario
    )
    VALUES (p_fecha, v_sabor_id, v_cantidad, p_vendedora_id, v_precio, v_costo)
    RETURNING id INTO v_venta_id;

    UPDATE hielera_stock_dia
    SET
      cantidad = cantidad - v_cantidad,
      updated_at = NOW()
    WHERE fecha = p_fecha AND sabor_id = v_sabor_id;

    v_total := v_total + (v_precio * v_cantidad);
  END LOOP;

  UPDATE ventas_ticket SET total_ingreso = v_total WHERE id = v_ticket_id;

  RETURN v_ticket_id;
END;
$$;

-- Compatibilidad: venta unitaria desde hielera
CREATE OR REPLACE FUNCTION registrar_venta(
  p_sabor_id UUID,
  p_cantidad INTEGER DEFAULT 1,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_vendedora_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  v_ticket_id := registrar_venta_ticket(
    p_fecha,
    jsonb_build_array(
      jsonb_build_object('sabor_id', p_sabor_id, 'cantidad', COALESCE(p_cantidad, 1))
    ),
    p_vendedora_id
  );
  RETURN v_ticket_id::TEXT;
END;
$$;

-- Vista para POS con ambos inventarios (fecha = hoy por defecto en app)
CREATE OR REPLACE VIEW inventario_pos_hielera AS
SELECT
  s.id AS sabor_id,
  s.nombre AS sabor_nombre,
  s.tipo,
  s.precio_venta,
  s.costo_produccion_unitario,
  s.es_preparacion,
  stock_produccion_disponible(s.id) AS stock_produccion,
  stock_hielera(CURRENT_DATE, s.id) AS stock_hielera,
  stock_almacen_disponible(CURRENT_DATE, s.id) AS stock_almacen,
  COALESCE(ipt.total_producido, 0) AS total_producido,
  COALESCE(ipt.total_vendido, 0) AS total_vendido
FROM sabores s
LEFT JOIN inventario_producto_terminado ipt ON ipt.sabor_id = s.id
WHERE COALESCE(s.es_preparacion, false) = false;

GRANT SELECT ON inventario_pos_hielera TO anon, authenticated;
GRANT ALL ON hielera_stock_dia, hielera_cargas, ventas_ticket, detalle_ventas TO authenticated;
GRANT EXECUTE ON FUNCTION cargar_hielera TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_venta_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION stock_hielera TO authenticated;
GRANT EXECUTE ON FUNCTION stock_almacen_disponible TO authenticated;
