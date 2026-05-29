-- Fresas con Crema: alinear con Excel (~$117.71 lote / $9.81 boli)

-- Fresas: bolsa 2 kg (2000 g), receta 8 × 20 g
UPDATE public.insumos
SET tamano_paquete = 2000
WHERE lower(trim(nombre)) LIKE '%fresa%congel%';

-- Tang fresa: sobre 380 g (Excel usa 1 × 380 g = $5.80)
UPDATE public.insumos
SET tamano_paquete = 380
WHERE lower(trim(nombre)) LIKE '%tang%fresa%';

-- Receta Fresas con Crema
UPDATE public.recetas
SET medida_usada = 20
WHERE sabor_id = 'ea7da6bc-ee7d-4998-8077-f9e02d516814'
  AND insumo_id IN (
    '3806ec9e-38c1-4c7b-981e-6e512a58ca9b',
    '9249ef20-6ffa-4338-84c7-e04e9ce2c572'
  );

UPDATE public.recetas
SET medida_usada = 380
WHERE sabor_id = 'ea7da6bc-ee7d-4998-8077-f9e02d516814'
  AND insumo_id = '353a1286-1519-44ff-993c-d0e183cb01ae';

UPDATE public.recetas
SET medida_usada = 11.7
WHERE sabor_id = 'ea7da6bc-ee7d-4998-8077-f9e02d516814'
  AND insumo_id = '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf';

SELECT public.recalcular_costo_sabor('ea7da6bc-ee7d-4998-8077-f9e02d516814');
