import type { Insumo } from '@/lib/types/database';

/** Variantes de unidad → forma canónica (sin barra inicial). */
const UNIDAD_CANONICA: Record<string, string> = {
  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogramo: 'kg',
  kilogramos: 'kg',
  g: 'g',
  gr: 'g',
  grs: 'g',
  gramo: 'g',
  gramos: 'g',
  lt: 'lt',
  l: 'lt',
  lts: 'lt',
  litro: 'lt',
  litros: 'lt',
  ml: 'ml',
  mililitro: 'ml',
  mililitros: 'ml',
  pza: 'pza',
  pzas: 'pza',
  pieza: 'pza',
  piezas: 'pza',
  u: 'u',
  un: 'u',
  unidad: 'u',
  unidades: 'u',
  bolsa: 'bolsa',
  bolsas: 'bolsa',
  caja: 'caja',
  cajas: 'caja',
  lb: 'lb',
  lbs: 'lb',
  libra: 'lb',
  libras: 'lb',
};

export function normalizarNombreInsumo(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

/** kg, /Kgs, KGS → kg */
export function normalizarUnidad(raw: string): string {
  const u = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/^\/+/, '');
  if (!u) return 'u';
  return UNIDAD_CANONICA[u] ?? u;
}

export function claveInsumo(insumo: Pick<Insumo, 'nombre' | 'unidad'>): string {
  return `${normalizarNombreInsumo(insumo.nombre)}|${normalizarUnidad(insumo.unidad)}`;
}

function puntuacionInsumo(insumo: Insumo): number {
  let score = 0;
  const stock = Number(insumo.cantidad_actual);
  if (Number.isFinite(stock) && stock >= 0) score += 100;

  const unidadRaw = insumo.unidad.trim().replace(/^\/+/, '').toLowerCase();
  if (unidadRaw === normalizarUnidad(insumo.unidad)) score += 30;

  if (insumo.created_at) {
    score += new Date(insumo.created_at).getTime() / 1e15;
  }

  return score;
}

function elegirMejor(prev: Insumo, next: Insumo): Insumo {
  return puntuacionInsumo(next) > puntuacionInsumo(prev) ? next : prev;
}

function insumoParaLista(insumo: Insumo): Insumo {
  const unidad = normalizarUnidad(insumo.unidad);
  return unidad === insumo.unidad ? insumo : { ...insumo, unidad };
}

/** Un insumo por nombre + unidad canónica. */
export function deduplicarInsumos(insumos: Insumo[]): Insumo[] {
  const map = new Map<string, Insumo>();

  for (const insumo of insumos) {
    const key = claveInsumo(insumo);
    const prev = map.get(key);
    map.set(key, prev ? elegirMejor(prev, insumo) : insumo);
  }

  return [...map.values()]
    .map(insumoParaLista)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function contarDuplicadosInsumos(insumos: Insumo[]): number {
  const keys = new Set(insumos.map(claveInsumo));
  return Math.max(0, insumos.length - keys.size);
}
