-- Asegura recálculo automático tipo Excel al cambiar insumos (ejecutar si aún no corriste 024).

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tgname
    FROM pg_trigger tr
    INNER JOIN pg_proc p ON tr.tgfoid = p.oid
    INNER JOIN pg_class c ON tr.tgrelid = c.oid
    INNER JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'insumos'
      AND p.proname = 'actualizar_costo_sabor'
      AND NOT tr.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.insumos', t.tgname);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.actualizar_costo_sabor() CASCADE;
DROP TRIGGER IF EXISTS insumos_after_precio_update ON public.insumos;

-- Tang: sobres de 13 g (Relación de insumos)
UPDATE public.insumos
SET tamano_paquete = 13
WHERE lower(trim(nombre)) LIKE '%tang%';

CREATE OR REPLACE FUNCTION public.trg_insumos_recalcular_costos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.precio IS DISTINCT FROM NEW.precio
      OR OLD.precio_oferta IS DISTINCT FROM NEW.precio_oferta
      OR OLD.en_oferta IS DISTINCT FROM NEW.en_oferta
      OR OLD.tamano_paquete IS DISTINCT FROM NEW.tamano_paquete
    THEN
      PERFORM public.recalcular_sabores_por_insumo(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insumos_recalcular_costos ON public.insumos;
CREATE TRIGGER insumos_recalcular_costos
  AFTER UPDATE ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_insumos_recalcular_costos();

SELECT public.recalcular_todos_los_costos();
