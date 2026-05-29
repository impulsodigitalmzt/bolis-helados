-- Leche Quemada: alinear con Excel (~$104.19 lote / $8.68 boli)

UPDATE public.recetas
SET medida_usada = 11.7
WHERE sabor_id = 'e4b22a6a-9c28-4da9-865c-104710e94c49'
  AND insumo_id = '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf';

SELECT public.recalcular_costo_sabor('e4b22a6a-9c28-4da9-865c-104710e94c49');
