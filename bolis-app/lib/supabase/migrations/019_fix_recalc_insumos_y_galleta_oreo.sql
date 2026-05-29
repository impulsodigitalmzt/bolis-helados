-- Arregla recálculo automático al cambiar precio/tamaño de insumo (trigger roto)
-- y alinea Galleta Oreo con Excel (~$116.49 / $9.71 boli)

-- Quitar triggers duplicados / función vieja que no propaga preparaciones
DROP TRIGGER IF EXISTS insumos_after_precio_update ON public.insumos;

CREATE OR REPLACE FUNCTION public.recalcular_costos_por_insumo(p_insumo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalcular_sabores_por_insumo(p_insumo_id);
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

-- Galleta Oreo: bolsas 11.7 g (galletas 13 piezas × medida 1 del paquete 24 pzas)
UPDATE public.recetas
SET medida_usada = 11.7
WHERE sabor_id = '980307f8-83ef-4356-ae9f-31510cee6c27'
  AND insumo_id = '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf';

UPDATE public.recetas
SET medida_usada = 1
WHERE sabor_id = '980307f8-83ef-4356-ae9f-31510cee6c27'
  AND insumo_id = '7805d2f2-f753-4b88-a70d-1bdcfeee346c';

SELECT public.recalcular_costo_sabor('980307f8-83ef-4356-ae9f-31510cee6c27');
SELECT public.recalcular_todos_los_costos();
