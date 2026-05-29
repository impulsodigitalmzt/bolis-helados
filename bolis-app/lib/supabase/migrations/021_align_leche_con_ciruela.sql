-- Leche con Ciruela: alinear con Excel (~$170.41 lote / $12.17 boli, rendimiento 14)

INSERT INTO public.recetas (sabor_id, insumo_id, cantidad_usada, medida_usada)
SELECT
  '6ffe845e-d9c3-4d72-b1d6-4d91dfd9e6e4',
  'be6cebff-933f-4c5a-bd5d-919aa5102650',
  0.5,
  380
WHERE NOT EXISTS (
  SELECT 1 FROM public.recetas
  WHERE sabor_id = '6ffe845e-d9c3-4d72-b1d6-4d91dfd9e6e4'
    AND insumo_id = 'be6cebff-933f-4c5a-bd5d-919aa5102650'
);

UPDATE public.recetas
SET medida_usada = 11.7
WHERE sabor_id = '6ffe845e-d9c3-4d72-b1d6-4d91dfd9e6e4'
  AND insumo_id = '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf';

UPDATE public.sabores
SET rendimiento = 14
WHERE id = '6ffe845e-d9c3-4d72-b1d6-4d91dfd9e6e4';

SELECT public.recalcular_costo_sabor('6ffe845e-d9c3-4d72-b1d6-4d91dfd9e6e4');
