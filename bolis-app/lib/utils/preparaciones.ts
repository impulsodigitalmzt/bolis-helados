import type { Insumo, Sabor } from '@/lib/types/database';
import { normalizarNombreInsumo } from '@/lib/utils/insumosDedup';

const NOMBRES_PREPARACION_LEGACY = [
  'preparacion base de leche',
  'preparación base de leche',
];

export function esNombrePreparacion(nombre: string): boolean {
  const n = normalizarNombreInsumo(nombre);
  return NOMBRES_PREPARACION_LEGACY.some((p) => n.includes(p));
}

export function filtrarInsumosCatalogo(
  insumos: Insumo[],
  preparaciones: Pick<Sabor, 'nombre' | 'es_preparacion'>[],
): Insumo[] {
  const nombresPrep = new Set(
    preparaciones
      .filter((s) => s.es_preparacion)
      .map((s) => normalizarNombreInsumo(s.nombre)),
  );

  return insumos.filter((i) => {
    const clave = normalizarNombreInsumo(i.nombre);
    if (nombresPrep.has(clave)) return false;
    if (esNombrePreparacion(i.nombre)) return false;
    return true;
  });
}
