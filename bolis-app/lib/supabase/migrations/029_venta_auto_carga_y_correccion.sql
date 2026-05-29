-- Auto-carga almacén→hielera al vender, ticket_id en ventas, corrección de tickets

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES ventas_ticket(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_ticket_id ON ventas(ticket_id);

-- Carga rápida: todo el almacén disponible del día → hielera
CREATE OR REPLACE FUNCTION cargar_hielera_todo(p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sabor RECORD;
  v_lineas JSONB := '[]'::JSONB;
  v_total INTEGER := 0;
BEGIN
  FOR v_sabor IN
    SELECT s.id AS sabor_id, stock_almacen_disponible(p_fecha, s.id) AS qty
    FROM sabores s
    WHERE COALESCE(s.es_preparacion, false) = false
      AND stock_almacen_disponible(p_fecha, s.id) > 0
  LOOP
    v_lineas := v_lineas || jsonb_build_array(
      jsonb_build_object('sabor_id', v_sabor.sabor_id, 'cantidad', v_sabor.qty)
    );
    v_total := v_total + v_sabor.qty;
  END LOOP;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  PERFORM cargar_hielera(p_fecha, v_lineas, NULL, 'Carga rápida — todo el almacén');
  RETURN v_total;
END;
$$;

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
      v_almacen := stock_almacen_disponible(p_fecha, v_sabor_id);

      IF v_falta > v_almacen THEN
        RAISE EXCEPTION 'Stock insuficiente (sabor %, hielera: %, almacén: %, solicitado: %)',
          v_sabor_id, v_en_hielera, v_almacen, v_cantidad;
      END IF;

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

CREATE OR REPLACE FUNCTION corregir_venta_ticket(
  p_ticket_id UUID,
  p_lineas JSONB,
  p_vendedora_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha DATE;
  v_linea RECORD;
  v_linea_n JSONB;
  v_sabor_id UUID;
  v_cantidad INTEGER;
  v_en_hielera INTEGER;
  v_falta INTEGER;
  v_almacen INTEGER;
  v_precio NUMERIC(12, 2);
  v_costo NUMERIC(12, 2);
  v_total NUMERIC(12, 2) := 0;
BEGIN
  SELECT fecha INTO v_fecha FROM ventas_ticket WHERE id = p_ticket_id;
  IF v_fecha IS NULL THEN
    RAISE EXCEPTION 'Ticket no encontrado';
  END IF;

  IF p_lineas IS NULL OR jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'El ticket corregido está vacío';
  END IF;

  FOR v_linea IN
    SELECT sabor_id, cantidad FROM detalle_ventas WHERE ticket_id = p_ticket_id
  LOOP
    INSERT INTO hielera_stock_dia (fecha, sabor_id, cantidad, updated_at)
    VALUES (v_fecha, v_linea.sabor_id, v_linea.cantidad, NOW())
    ON CONFLICT (fecha, sabor_id)
    DO UPDATE SET
      cantidad = hielera_stock_dia.cantidad + EXCLUDED.cantidad,
      updated_at = NOW();
  END LOOP;

  DELETE FROM ventas WHERE ticket_id = p_ticket_id;
  DELETE FROM detalle_ventas WHERE ticket_id = p_ticket_id;

  FOR v_linea_n IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_sabor_id := (v_linea_n->>'sabor_id')::UUID;
    v_cantidad := COALESCE((v_linea_n->>'cantidad')::INTEGER, 0);

    IF v_cantidad <= 0 THEN
      CONTINUE;
    END IF;

    v_en_hielera := stock_hielera(v_fecha, v_sabor_id);

    IF v_cantidad > v_en_hielera THEN
      v_falta := v_cantidad - v_en_hielera;
      v_almacen := stock_almacen_disponible(v_fecha, v_sabor_id);
      IF v_falta > v_almacen THEN
        RAISE EXCEPTION 'Stock insuficiente para corregir (sabor %)', v_sabor_id;
      END IF;
      INSERT INTO hielera_cargas (fecha, sabor_id, cantidad, notas)
      VALUES (v_fecha, v_sabor_id, v_falta, 'Auto-carga al corregir venta');
      INSERT INTO hielera_stock_dia (fecha, sabor_id, cantidad, updated_at)
      VALUES (v_fecha, v_sabor_id, v_falta, NOW())
      ON CONFLICT (fecha, sabor_id)
      DO UPDATE SET cantidad = hielera_stock_dia.cantidad + EXCLUDED.cantidad, updated_at = NOW();
      v_en_hielera := stock_hielera(v_fecha, v_sabor_id);
    END IF;

    SELECT precio_venta, COALESCE(costo_produccion_unitario, 0)
    INTO v_precio, v_costo FROM sabores WHERE id = v_sabor_id;

    INSERT INTO detalle_ventas (ticket_id, sabor_id, cantidad, precio_venta_unitario, costo_produccion_unitario)
    VALUES (p_ticket_id, v_sabor_id, v_cantidad, v_precio, v_costo);

    INSERT INTO ventas (fecha, sabor_id, cantidad, vendedora_id, precio_venta_unitario, costo_produccion_unitario, ticket_id)
    VALUES (v_fecha, v_sabor_id, v_cantidad, p_vendedora_id, v_precio, v_costo, p_ticket_id);

    UPDATE hielera_stock_dia
    SET cantidad = cantidad - v_cantidad, updated_at = NOW()
    WHERE fecha = v_fecha AND sabor_id = v_sabor_id;

    v_total := v_total + (v_precio * v_cantidad);
  END LOOP;

  UPDATE ventas_ticket
  SET total_ingreso = v_total,
      vendedora_id = COALESCE(p_vendedora_id, vendedora_id)
  WHERE id = p_ticket_id;

  RETURN p_ticket_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cargar_hielera_todo TO authenticated;
GRANT EXECUTE ON FUNCTION corregir_venta_ticket TO authenticated;
