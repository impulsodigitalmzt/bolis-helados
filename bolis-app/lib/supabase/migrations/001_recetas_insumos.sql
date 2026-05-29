-- =============================================================================
-- Costos por receta: insumos + recetas + recálculo automático de sabores
-- Ejecutar en Supabase → SQL Editor
-- =============================================================================

-- 1. Tabla insumos
CREATE TABLE IF NOT EXISTS public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  precio NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  unidad TEXT NOT NULL DEFAULT 'u',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insumos_nombre ON public.insumos (nombre);

-- 2. Tabla recetas (ingredientes por sabor)
CREATE TABLE IF NOT EXISTS public.recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sabor_id UUID NOT NULL REFERENCES public.sabores (id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES public.insumos (id) ON DELETE RESTRICT,
  cantidad_usada NUMERIC(12, 6) NOT NULL DEFAULT 0 CHECK (cantidad_usada >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sabor_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_recetas_sabor ON public.recetas (sabor_id);
CREATE INDEX IF NOT EXISTS idx_recetas_insumo ON public.recetas (insumo_id);

-- 3. Recalcular costo unitario de un sabor = Σ(cantidad_usada × precio insumo)
CREATE OR REPLACE FUNCTION public.recalcular_costo_sabor(p_sabor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_costo NUMERIC(12, 4);
BEGIN
  SELECT COALESCE(SUM(r.cantidad_usada * i.precio), 0)
  INTO v_costo
  FROM public.recetas r
  INNER JOIN public.insumos i ON i.id = r.insumo_id
  WHERE r.sabor_id = p_sabor_id;

  UPDATE public.sabores
  SET costo_produccion_unitario = ROUND(v_costo, 4)
  WHERE id = p_sabor_id;
END;
$$;

-- 4. Recalcular todos los sabores que usan un insumo (al cambiar su precio)
CREATE OR REPLACE FUNCTION public.recalcular_costos_por_insumo(p_insumo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sabor_id UUID;
BEGIN
  FOR v_sabor_id IN
    SELECT DISTINCT r.sabor_id
    FROM public.recetas r
    WHERE r.insumo_id = p_insumo_id
  LOOP
    PERFORM public.recalcular_costo_sabor(v_sabor_id);
  END LOOP;
END;
$$;

-- 5. Trigger: actualizar precio de insumo → recalcular sabores afectados
CREATE OR REPLACE FUNCTION public.trg_insumos_precio_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.precio IS DISTINCT FROM NEW.precio) THEN
    PERFORM public.recalcular_costos_por_insumo(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insumos_after_precio_update ON public.insumos;
CREATE TRIGGER insumos_after_precio_update
  AFTER UPDATE OF precio ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_insumos_precio_recalc();

-- 6. Trigger: cambios en recetas → recalcular ese sabor
CREATE OR REPLACE FUNCTION public.trg_recetas_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_costo_sabor(OLD.sabor_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalcular_costo_sabor(NEW.sabor_id);

  IF TG_OP = 'UPDATE' AND OLD.sabor_id IS DISTINCT FROM NEW.sabor_id THEN
    PERFORM public.recalcular_costo_sabor(OLD.sabor_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recetas_after_change ON public.recetas;
CREATE TRIGGER recetas_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.recetas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recetas_recalc();

-- 7. Recalcular todos los sabores (útil tras migración inicial)
CREATE OR REPLACE FUNCTION public.recalcular_todos_los_costos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sabor_id UUID;
BEGIN
  FOR v_sabor_id IN SELECT id FROM public.sabores
  LOOP
    PERFORM public.recalcular_costo_sabor(v_sabor_id);
  END LOOP;
END;
$$;

-- 8. RLS básico para app con anon key (ajusta según tu seguridad)
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insumos_anon_all" ON public.insumos;
CREATE POLICY "insumos_anon_all" ON public.insumos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "recetas_anon_all" ON public.recetas;
CREATE POLICY "recetas_anon_all" ON public.recetas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 9. Vista dashboard (usa costo_produccion_unitario ya recalculado en sabores)
-- Si ya tienes vista_resumen_ventas, no necesitas cambiarla:
-- sigue leyendo s.costo_produccion_unitario desde sabores.
