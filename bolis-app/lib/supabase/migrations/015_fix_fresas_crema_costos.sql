-- Corrige costos inflados (ej. Fresas con Crema ~$61 vs Excel ~$9.81)
-- Causas típicas: cantidad de preparación = gramos del Excel (2090 en vez de 1 lote),
-- tamaño de paquete mal en insumos (tang 13 vs 380, fresa 2 vs 20).

-- Preparación base: rendimiento = 1 lote (no piezas ni gramos)
UPDATE public.sabores
SET rendimiento = 1
WHERE COALESCE(es_preparacion, false) = true
  AND (rendimiento IS NULL OR rendimiento <= 0 OR rendimiento > 50);

-- En productos: preparación = lotes (1), no gramos totales del Excel
UPDATE public.recetas r
SET cantidad_usada = 1,
    medida_usada = 1
FROM public.sabores s
WHERE r.sabor_id = s.id
  AND COALESCE(s.es_preparacion, false) = false
  AND r.preparacion_sabor_id IS NOT NULL
  AND r.cantidad_usada > 10;

-- Tang del Excel: paquete 380 g
UPDATE public.insumos
SET tamano_paquete = 380
WHERE lower(trim(nombre)) LIKE '%tang%';

-- Fresa congelada: porción 20 g en receta (8 × $2)
UPDATE public.insumos
SET tamano_paquete = 20
WHERE lower(trim(nombre)) LIKE '%fresa%congel%'
   OR lower(trim(nombre)) LIKE '%fresas%congel%'
   OR (lower(trim(nombre)) LIKE '%fresa%' AND lower(trim(nombre)) NOT LIKE '%crema%');

-- Bolsas: precio por bolsa (~$1.39) → tamaño 1; si precio es por kg, tamaño 1000
UPDATE public.insumos
SET tamano_paquete = 1
WHERE lower(trim(nombre)) LIKE '%bolsa%'
  AND precio < 20;

UPDATE public.insumos
SET tamano_paquete = 1000
WHERE lower(trim(nombre)) LIKE '%bolsa%'
  AND precio >= 20;

SELECT public.recalcular_todos_los_costos();
