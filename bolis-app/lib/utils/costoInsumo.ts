import type { Insumo } from '@/lib/types/database';
import { precioEfectivoInsumo } from '@/lib/queries/insumos';

/**
 * Costo de línea como Excel:
 *   (CANTIDAD × MEDIDA ÷ tamaño paquete) × precio
 *
 * - CANTIDAD → cantidad_usada
 * - MEDIDA   → medida_usada (por defecto 1)
 * - tamaño paquete → columna cantidad de "Relación de insumos"
 * - precio → precio del paquete
 *
 * Ejemplos:
 * - CMC: 7.5 / 180 × 58        (medida = 1)
 * - Galleta María: 1.5 × 144 / 432 × 38
 * - Azúcar: 345 / 1000 × 24     (tamano paquete en gramos)
 */
export function tamanoPaqueteInsumo(insumo: Insumo): number {
  const t = Number(insumo.tamano_paquete);
  return t > 0 ? t : 1;
}

export function costoLineaInsumo(
  cantidadUsada: number,
  insumo: Insumo | null | undefined,
  medidaUsada = 1,
): number {
  if (!insumo || cantidadUsada <= 0) return 0;
  const medida = medidaUsada > 0 ? medidaUsada : 1;
  const precio = precioEfectivoInsumo(insumo);
  const tamano = tamanoPaqueteInsumo(insumo);
  return cantidadUsada * (precio / tamano) * medida;
}

export function precioUnitarioInsumo(insumo: Insumo): number {
  return precioEfectivoInsumo(insumo) / tamanoPaqueteInsumo(insumo);
}

/** Cantidad física para inventario (g, ml, piezas…) */
export function consumoFisicoInsumo(
  cantidadUsada: number,
  medidaUsada = 1,
): number {
  const medida = medidaUsada > 0 ? medidaUsada : 1;
  return cantidadUsada * medida;
}
