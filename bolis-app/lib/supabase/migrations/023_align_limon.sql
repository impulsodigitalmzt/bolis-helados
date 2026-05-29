-- Limón (agua): receta completa según Excel (~$34.15 lote / $2.44 boli, 14 pz)

INSERT INTO public.insumos (nombre, precio, tamano_paquete, unidad, cantidad_actual)
SELECT 'Agua', 5, 1.5, 'lt', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.insumos WHERE lower(trim(nombre)) = 'agua'
);

UPDATE public.insumos
SET tamano_paquete = 13, precio = 6.5
WHERE id = '96a409c6-5931-4537-a87d-307fe5e15c01';

UPDATE public.sabores
SET rendimiento = 14
WHERE id = 'fb43fc56-8b96-46e4-9e66-250d67b8e6f8';

DELETE FROM public.recetas
WHERE sabor_id = 'fb43fc56-8b96-46e4-9e66-250d67b8e6f8';

INSERT INTO public.recetas (sabor_id, insumo_id, cantidad_usada, medida_usada)
VALUES
  ('fb43fc56-8b96-46e4-9e66-250d67b8e6f8', '96a409c6-5931-4537-a87d-307fe5e15c01', 1, 13),
  ('fb43fc56-8b96-46e4-9e66-250d67b8e6f8', 'df59b111-e0ba-415e-87e1-e30af453382d', 170, 1),
  (
    'fb43fc56-8b96-46e4-9e66-250d67b8e6f8',
    (SELECT id FROM public.insumos WHERE lower(trim(nombre)) = 'agua' LIMIT 1),
    1,
    1.5
  ),
  ('fb43fc56-8b96-46e4-9e66-250d67b8e6f8', '88f18e2c-a95a-4a8b-a576-d7f42d1cb413', 7.5, 1),
  ('fb43fc56-8b96-46e4-9e66-250d67b8e6f8', '6ce2bc35-fcc3-4835-bd7e-e56c08b78bbf', 14, 11.7);

SELECT public.recalcular_costo_sabor('fb43fc56-8b96-46e4-9e66-250d67b8e6f8');
