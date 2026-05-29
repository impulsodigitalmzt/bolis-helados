-- Al cambiar precio/oferta/tamaño de un insumo → recalcula preparaciones y productos (como Excel)

CREATE OR REPLACE FUNCTION public.recalcular_sabores_por_insumo(p_insumo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prep_id UUID;
  v_sabor_id UUID;
BEGIN
  FOR v_prep_id IN
    SELECT DISTINCT s.id
    FROM public.sabores s
    INNER JOIN public.recetas r ON r.sabor_id = s.id
    WHERE r.insumo_id = p_insumo_id
      AND COALESCE(s.es_preparacion, false) = true
  LOOP
    PERFORM public.recalcular_costo_sabor(v_prep_id);
    PERFORM public.recalcular_sabores_que_usan_preparacion(v_prep_id);
  END LOOP;

  FOR v_sabor_id IN
    SELECT DISTINCT r.sabor_id
    FROM public.recetas r
    INNER JOIN public.sabores s ON s.id = r.sabor_id
    WHERE r.insumo_id = p_insumo_id
      AND COALESCE(s.es_preparacion, false) = false
  LOOP
    PERFORM public.recalcular_costo_sabor(v_sabor_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalcular_todos_los_costos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN
    SELECT id FROM public.sabores WHERE COALESCE(es_preparacion, false) = true ORDER BY nombre
  LOOP
    PERFORM public.recalcular_costo_sabor(s.id);
  END LOOP;

  FOR s IN
    SELECT id FROM public.sabores WHERE COALESCE(es_preparacion, false) = false ORDER BY nombre
  LOOP
    PERFORM public.recalcular_costo_sabor(s.id);
  END LOOP;
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.recalcular_sabores_por_insumo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_todos_los_costos() TO anon, authenticated;
