-- Esquema Bolis & Más — costos por receta
-- Ejecutar migrations/001_recetas_insumos.sql en Supabase SQL Editor

-- TABLAS BASE
-- sabores: id, nombre, tipo, precio_venta, rendimiento, costo_produccion_unitario (AUTO), created_at
-- vendedoras: id, nombre, comision_por_boli, created_at
-- ventas: id, fecha, sabor_id, cantidad, vendedora_id (nullable), precio_venta_unitario, costo_produccion_unitario, created_at

-- NUEVAS
-- insumos: id, nombre, precio, unidad, cantidad_actual, en_oferta, precio_oferta, created_at
-- historial_produccion: id, fecha, sabor_id, cantidad, created_at
-- config_negocio: modalidad (casa|local), costo_oportunidad_casa, renta, luz, gas, internet, otros_servicios
-- historial_precios_insumos: cambios de precio por compra o edición manual
-- logs_sistema: auditoría (producción, ventas, recetas, insumos, config)
-- RPC: calcular_sugerencia_compra, registrar_compra_insumo, registrar_log
-- recetas: id, sabor_id, insumo_id, cantidad_usada, created_at

-- CÁLCULO AUTOMÁTICO (migraciones 011–014, todos los sabores):
-- costo línea = cantidad_usada × medida_usada ÷ tamano_paquete × precio (como Excel)
-- costo_produccion_unitario = total lote ÷ rendimiento
-- Se recalcula solo al: cambiar insumo (precio/oferta/tamaño) | guardar/editar receta

-- VISTAS (migración 005_ventas_pos_finanzas.sql):
-- vista_reporte_ventas — costos/precios históricos guardados en cada venta
-- inventario_producto_terminado — producción − ventas por sabor
-- reporte_utilidad_mensual — ingresos, costos, utilidad_bruta por mes
-- RPC registrar_venta — venta transaccional + validación de stock

-- Tras cargar recetas desde Excel, ejecutar una vez:
-- SELECT recalcular_todos_los_costos();
