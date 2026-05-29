-- Galleta María: alinear con Excel (~$114.91 lote / $9.58 boli)

UPDATE public.recetas
SET medida_usada = 144
WHERE sabor_id = 'd23406cd-ddc1-421b-9b57-db62e3461df1'
  AND insumo_id = 'dd537128-7b60-4d7b-8ad7-a98d96c32da9';

UPDATE public.recetas
SET medida_usada = 11.7
WHERE sabor_id = 'd23406cd-ddc1-421b-9b57-db62e3461df1'
  AND insumo_id = '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf';

SELECT public.recalcular_costo_sabor('d23406cd-ddc1-421b-9b57-db62e3461df1');
