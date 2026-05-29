/** Sabores visibles y orden en el punto de venta */

function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** No se venden en POS (insumos base / preparaciones) */
const EXCLUIR_EN_POS = ['preparacion base de leche'];

/**
 * Orden en pantalla Venta (1–11).
 * Coincidencia flexible por nombre normalizado.
 */
const ORDEN_POS: string[] = [
  'galleta maria',
  'mango con chile',
  'leche con ciruela',
  'nuez',
  'leche quemada',
  'galleta oreo',
  'coco',
  'vainilla',
  'fresas con crema',
  'baileys',
  'limon',
];

function indiceOrden(nombre: string): number {
  const n = normalizarNombre(nombre);
  for (let i = 0; i < ORDEN_POS.length; i++) {
    const patron = ORDEN_POS[i];
    if (n === patron || n.includes(patron)) {
      return i;
    }
  }
  return ORDEN_POS.length;
}

export function esSaborVisibleEnPos(
  nombre: string,
  esPreparacion?: boolean,
): boolean {
  if (esPreparacion) return false;
  const n = normalizarNombre(nombre);
  return !EXCLUIR_EN_POS.some((ex) => n.includes(ex));
}

export function filtrarYOrdenarSaboresPos<
  T extends { sabor_nombre: string; es_preparacion?: boolean },
>(items: T[]): T[] {
  return items
    .filter((item) =>
      esSaborVisibleEnPos(item.sabor_nombre, item.es_preparacion),
    )
    .sort((a, b) => {
      const pa = indiceOrden(a.sabor_nombre);
      const pb = indiceOrden(b.sabor_nombre);
      if (pa !== pb) return pa - pb;
      return a.sabor_nombre.localeCompare(b.sabor_nombre, 'es');
    });
}
