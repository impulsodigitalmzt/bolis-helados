-- Mango con Chile: receta según Excel (~$51.47 lote / $3.68 boli, 14 pz)
-- Ejecutar después de 024_drop_legacy_actualizar_costo_sabor.sql

UPDATE public.insumos
SET tamano_paquete = 13, precio = 5.8
WHERE id = '43676ea6-9e1d-4dc1-8eab-bb2e670cb812';

UPDATE public.sabores
SET rendimiento = 14, precio_venta = 25
WHERE id = '1862383f-6f5b-45b1-babd-0b0b548395fb';

DELETE FROM public.recetas
WHERE sabor_id = '1862383f-6f5b-45b1-babd-0b0b548395fb';

INSERT INTO public.recetas (sabor_id, insumo_id, cantidad_usada, medida_usada)
VALUES
  ('1862383f-6f5b-45b1-babd-0b0b548395fb', 'df59b111-e0ba-415e-87e1-e30af453382d', 345, 1),
  ('1862383f-6f5b-45b1-babd-0b0b548395fb', '76000638-e8c5-4b6c-90b8-f990a973cdc5', 500, 1),
  ('1862383f-6f5b-45b1-babd-0b0b548395fb', '43676ea6-9e1d-4dc1-8eab-bb2e670cb812', 6.5, 1),
  ('1862383f-6f5b-45b1-babd-0b0b548395fb', 'f3d263b8-0a32-4cf9-b867-c91c19220b99', 30, 1),
  ('1862383f-6f5b-45b1-babd-0b0b548395fb', '88f18e2c-a95a-4a8b-a576-d7f42d1cb413', 7.5, 1),
  ('1862383f-6f5b-45b1-babd-0b0b548395fb', '3cc563d3-312c-4cce-bf7b-45ef39f59d22', 1, 1.5),
  ('1862383f-6f5b-45b1-babd-0b0b548395fb', '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf', 14, 11.7);

SELECT public.recalcular_costo_sabor('1862383f-6f5b-45b1-babd-0b0b548395fb');
