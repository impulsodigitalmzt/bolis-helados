-- Vainilla: alinear con Excel (~$106.91 lote / $8.91 boli)

UPDATE public.recetas
SET medida_usada = 30
WHERE sabor_id = (SELECT id FROM public.sabores WHERE nombre = 'Vainilla' LIMIT 1)
  AND insumo_id = 'c0bca783-a13c-48b4-a748-8cd7228a9c68';

UPDATE public.recetas
SET medida_usada = 11.7
WHERE sabor_id = (SELECT id FROM public.sabores WHERE nombre = 'Vainilla' LIMIT 1)
  AND insumo_id = '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf';

SELECT public.recalcular_costo_sabor(
  (SELECT id FROM public.sabores WHERE nombre = 'Vainilla' LIMIT 1)
);
