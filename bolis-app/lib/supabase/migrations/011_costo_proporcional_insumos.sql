-- Costo como Excel: (cantidad_usada / tamano_paquete) × precio
-- tamano_paquete = columna "cantidad" de la hoja Relación de insumos

ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS tamano_paquete NUMERIC(14, 6) NOT NULL DEFAULT 1
    CHECK (tamano_paquete > 0);

CREATE OR REPLACE FUNCTION public.precio_efectivo_insumo(i public.insumos)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN i.en_oferta AND i.precio_oferta IS NOT NULL THEN i.precio_oferta
    ELSE i.precio
  END;
$$;

CREATE OR REPLACE FUNCTION public.costo_linea_insumo(
  p_cantidad_usada NUMERIC,
  i public.insumos
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT ROUND(
    (p_cantidad_usada / COALESCE(NULLIF(i.tamano_paquete, 0), 1))
    * public.precio_efectivo_insumo(i),
    4
  );
$$;

-- Valores de la hoja "Relación de insumos" (columna cantidad = tamaño del paquete)
UPDATE public.insumos SET tamano_paquete = 1.5
  WHERE lower(trim(nombre)) LIKE '%leche entera%';

UPDATE public.insumos SET tamano_paquete = 180
  WHERE lower(trim(nombre)) = 'cmc';

UPDATE public.insumos SET tamano_paquete = 380
  WHERE lower(trim(nombre)) LIKE '%leche condensada%';

UPDATE public.insumos SET tamano_paquete = 1
  WHERE lower(trim(nombre)) LIKE '%ciruela%';

UPDATE public.insumos SET tamano_paquete = 120
  WHERE lower(trim(nombre)) LIKE '%vainilla%helado%';

UPDATE public.insumos SET tamano_paquete = 150
  WHERE lower(trim(nombre)) LIKE '%vainilla%'
    AND lower(trim(nombre)) NOT LIKE '%helado%';

UPDATE public.insumos SET tamano_paquete = 24
  WHERE lower(trim(nombre)) LIKE '%galleta oreo%'
   OR lower(trim(nombre)) LIKE '%oreo%';

UPDATE public.insumos SET tamano_paquete = 432
  WHERE lower(trim(nombre)) LIKE '%galleta maria%'
   OR lower(trim(nombre)) LIKE '%maria%';

UPDATE public.insumos SET tamano_paquete = 13
  WHERE lower(trim(nombre)) LIKE '%tang%';

UPDATE public.insumos SET tamano_paquete = 255
  WHERE lower(trim(nombre)) LIKE '%tajin%';

UPDATE public.insumos SET tamano_paquete = 1
  WHERE lower(trim(nombre)) = 'mango'
   OR lower(trim(nombre)) LIKE 'mango %';

UPDATE public.insumos SET tamano_paquete = 2
  WHERE lower(trim(nombre)) LIKE '%fresa%';

UPDATE public.insumos SET tamano_paquete = 47
  WHERE lower(trim(nombre)) LIKE '%maicena%';

-- Recetas en ml (ej. 250 ml): tamaño 1000 ml = 1 lt
UPDATE public.insumos SET tamano_paquete = 1000
  WHERE lower(trim(nombre)) LIKE '%baileys%';

UPDATE public.insumos SET tamano_paquete = 100
  WHERE lower(trim(nombre)) LIKE '%nuez%';

UPDATE public.insumos SET tamano_paquete = 1
  WHERE lower(trim(nombre)) LIKE '%azúcar%'
   OR lower(trim(nombre)) LIKE '%azucar%';

UPDATE public.insumos SET tamano_paquete = 1000
  WHERE lower(trim(nombre)) LIKE '%bolsa%helado%';

UPDATE public.insumos SET tamano_paquete = 500
  WHERE lower(trim(nombre)) LIKE '%bolsa%entrega%';

UPDATE public.insumos SET tamano_paquete = 1
  WHERE lower(trim(nombre)) LIKE '%servilleta%';

-- Agua (recetas de agua): 1.5 Lts ≈ $5 en Excel
UPDATE public.insumos SET tamano_paquete = 1.5
  WHERE lower(trim(nombre)) = 'agua';

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
    SELECT public.costo_linea_insumo(r.cantidad_usada, i) AS costo_linea
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

-- Primero preparaciones, luego productos
DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN
    SELECT id FROM public.sabores WHERE es_preparacion = true ORDER BY nombre
  LOOP
    PERFORM public.recalcular_costo_sabor(s.id);
  END LOOP;

  FOR s IN
    SELECT id FROM public.sabores WHERE COALESCE(es_preparacion, false) = false ORDER BY nombre
  LOOP
    PERFORM public.recalcular_costo_sabor(s.id);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.costo_linea_insumo(NUMERIC, public.insumos) TO anon, authenticated;
