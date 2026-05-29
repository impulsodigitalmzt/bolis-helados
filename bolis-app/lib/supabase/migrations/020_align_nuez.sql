-- Nuez: alinear con Excel (~$110.11 lote / $9.18 boli)

UPDATE public.insumos
SET tamano_paquete = 47
WHERE id = '21800d3c-cb88-4d38-8278-7d8622671b4b';

UPDATE public.recetas
SET medida_usada = 47
WHERE sabor_id = '06f96ded-a088-4d9d-a8f0-4da6d7cda075'
  AND insumo_id = '21800d3c-cb88-4d38-8278-7d8622671b4b';

UPDATE public.recetas
SET medida_usada = 11.7
WHERE sabor_id = '06f96ded-a088-4d9d-a8f0-4da6d7cda075'
  AND insumo_id = '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf';

SELECT public.recalcular_costo_sabor('06f96ded-a088-4d9d-a8f0-4da6d7cda075');
