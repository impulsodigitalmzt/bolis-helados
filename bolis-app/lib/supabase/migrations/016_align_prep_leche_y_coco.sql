-- Alinea "Preparación base de leche" y "Coco" con el Excel (mayo 2026)
-- Prep: $79.62 por lote (rendimiento = 1)
-- Coco: $110.21 lote / 12 bolis → $9.18 por boli

-- Preparación: 1 lote, no 12 piezas
UPDATE public.sabores
SET rendimiento = 1
WHERE id = '9fa6c5a6-de9c-4c20-96b5-172dbdfa4358'
  AND COALESCE(es_preparacion, false) = true;

DELETE FROM public.recetas
WHERE sabor_id = '9fa6c5a6-de9c-4c20-96b5-172dbdfa4358';

INSERT INTO public.recetas (sabor_id, insumo_id, cantidad_usada, medida_usada)
VALUES
  ('9fa6c5a6-de9c-4c20-96b5-172dbdfa4358', '7b703f25-cf1e-4e55-8e79-4ffde8d5d377', 1, 1500),   -- Leche entera
  ('9fa6c5a6-de9c-4c20-96b5-172dbdfa4358', '572e24b9-80a2-456d-8bf8-ca68d41f69b5', 1, 30),      -- Vainilla
  ('9fa6c5a6-de9c-4c20-96b5-172dbdfa4358', '88f18e2c-a95a-4a8b-a576-d7f42d1cb413', 7.5, 1),     -- CMC
  ('9fa6c5a6-de9c-4c20-96b5-172dbdfa4358', 'be6cebff-933f-4c5a-bd5d-919aa5102650', 1.5, 380);   -- Leche condensada

-- Coco: medidas del Excel
UPDATE public.recetas
SET medida_usada = 47
WHERE sabor_id = 'b3b04d8d-49c2-41e9-a0a5-34d993874397'
  AND insumo_id = '1cc57d5a-543f-4062-b46e-262f0cd1c853';

UPDATE public.recetas
SET medida_usada = 11.7
WHERE sabor_id = 'b3b04d8d-49c2-41e9-a0a5-34d993874397'
  AND insumo_id = '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf';

-- Coco usa 1 lote de preparación (cantidad 1, medida 1)
UPDATE public.recetas
SET cantidad_usada = 1, medida_usada = 1
WHERE sabor_id = 'b3b04d8d-49c2-41e9-a0a5-34d993874397'
  AND preparacion_sabor_id = '9fa6c5a6-de9c-4c20-96b5-172dbdfa4358';

SELECT public.recalcular_costo_sabor('9fa6c5a6-de9c-4c20-96b5-172dbdfa4358');
SELECT public.recalcular_costo_sabor('b3b04d8d-49c2-41e9-a0a5-34d993874397');
