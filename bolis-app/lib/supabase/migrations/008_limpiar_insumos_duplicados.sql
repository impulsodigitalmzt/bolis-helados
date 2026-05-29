-- Elimina insumos duplicados (mismo nombre + unidad equivalente: kg/kgs, gr/grs, etc.)
-- Ejecutar en Supabase → SQL Editor si ves filas repetidas por insumo

-- Requisito: columnas que usa el trigger de auditoría (migración 007)
ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS en_oferta BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(12, 4);

CREATE OR REPLACE FUNCTION public.normalizar_unidad_insumo(u TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN v = '' THEN 'u'
    WHEN v IN ('kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos') THEN 'kg'
    WHEN v IN ('g', 'gr', 'grs', 'gramo', 'gramos') THEN 'g'
    WHEN v IN ('lt', 'l', 'lts', 'litro', 'litros') THEN 'lt'
    WHEN v IN ('ml', 'mililitro', 'mililitros') THEN 'ml'
    WHEN v IN ('pza', 'pzas', 'pieza', 'piezas') THEN 'pza'
    WHEN v IN ('u', 'un', 'unidad', 'unidades') THEN 'u'
    WHEN v = 'bolsas' THEN 'bolsa'
    WHEN v = 'cajas' THEN 'caja'
    WHEN v IN ('lb', 'lbs', 'libra', 'libras') THEN 'lb'
    ELSE v
  END
  FROM (
    SELECT lower(trim(regexp_replace(coalesce(u, ''), '^/+', ''))) AS v
  ) AS norm;
$$;

CREATE OR REPLACE FUNCTION public.limpiar_insumos_duplicados()
RETURNS TABLE (eliminados INT, conservados INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eliminados INT := 0;
  v_conservados INT := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    WITH ranked AS (
      SELECT
        id,
        lower(trim(nombre)) AS n,
        public.normalizar_unidad_insumo(unidad) AS u,
        ROW_NUMBER() OVER (
          PARTITION BY
            lower(trim(nombre)),
            public.normalizar_unidad_insumo(unidad)
          ORDER BY
            CASE
              WHEN cantidad_actual IS NOT NULL AND cantidad_actual >= 0 THEN 1
              ELSE 0
            END DESC,
            created_at DESC NULLS LAST,
            id DESC
        ) AS rn
      FROM public.insumos
    ),
    keeper AS (
      SELECT n, u, id AS keep_id FROM ranked WHERE rn = 1
    ),
    dupe AS (
      SELECT r.id AS dupe_id, k.keep_id
      FROM ranked r
      INNER JOIN keeper k ON k.n = r.n AND k.u = r.u
      WHERE r.rn > 1
    )
    SELECT * FROM dupe
  LOOP
    UPDATE public.recetas
    SET insumo_id = rec.keep_id
    WHERE insumo_id = rec.dupe_id;

    DELETE FROM public.historial_precios_insumos
    WHERE insumo_id = rec.dupe_id;

    DELETE FROM public.insumos WHERE id = rec.dupe_id;
    v_eliminados := v_eliminados + 1;
  END LOOP;

  UPDATE public.insumos i
  SET unidad = public.normalizar_unidad_insumo(i.unidad)
  WHERE i.unidad IS DISTINCT FROM public.normalizar_unidad_insumo(i.unidad);

  SELECT COUNT(*)::INT INTO v_conservados
  FROM (
    SELECT 1
    FROM public.insumos
    GROUP BY lower(trim(nombre)), public.normalizar_unidad_insumo(unidad)
  ) t;

  RETURN QUERY SELECT v_eliminados, v_conservados;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalizar_unidad_insumo(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limpiar_insumos_duplicados() TO anon, authenticated;

-- 1) Crear funciones (todo el archivo anterior)
-- 2) Limpiar duplicados:
-- SELECT * FROM limpiar_insumos_duplicados();
