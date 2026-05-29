import { supabase } from '@/lib/supabaseClient';
import type { Insumo } from '@/lib/types/database';
import { getSabores } from '@/lib/queries/sabores';
import {
  claveInsumo,
  contarDuplicadosInsumos,
  deduplicarInsumos,
  normalizarUnidad,
} from '@/lib/utils/insumosDedup';
import { filtrarInsumosCatalogo } from '@/lib/utils/preparaciones';
import { assertNoError } from './errors';

export function precioEfectivoInsumo(insumo: Insumo): number {
  if (insumo.en_oferta && insumo.precio_oferta != null) {
    return insumo.precio_oferta;
  }
  return insumo.precio;
}

export async function getInsumos(): Promise<Insumo[]> {
  const { insumos } = await getInsumosConMeta();
  return insumos;
}

export async function getInsumosConMeta(): Promise<{
  insumos: Insumo[];
  duplicadosEnBd: number;
}> {
  const [raw, sabores] = await Promise.all([getInsumosRaw(), getSabores()]);
  const catalogo = filtrarInsumosCatalogo(raw, sabores);
  return {
    insumos: deduplicarInsumos(catalogo),
    duplicadosEnBd: contarDuplicadosInsumos(catalogo),
  };
}

export async function getInsumosRaw(): Promise<Insumo[]> {
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .order('nombre');

  assertNoError(error, 'Error al cargar insumos');
  return (data ?? []).map(normalizeInsumo);
}

function normalizeInsumo(row: Insumo): Insumo {
  const tamano = Number(row.tamano_paquete);
  return {
    ...row,
    tamano_paquete: tamano > 0 ? tamano : 1,
    cantidad_actual: Number(row.cantidad_actual) >= 0 ? Number(row.cantidad_actual) : 0,
    en_oferta: row.en_oferta ?? false,
    precio_oferta: row.precio_oferta ?? null,
  };
}

export interface InsumoUpdatePayload {
  id: string;
  precio: number;
  tamano_paquete: number;
  cantidad_actual: number;
  en_oferta: boolean;
  precio_oferta: number | null;
}

export async function updateInsumo(
  payload: InsumoUpdatePayload,
  options?: { recalcular?: boolean },
): Promise<Insumo> {
  const { data, error } = await supabase
    .from('insumos')
    .update({
      precio: payload.precio,
      tamano_paquete: payload.tamano_paquete,
      cantidad_actual: payload.cantidad_actual,
      en_oferta: payload.en_oferta,
      precio_oferta: payload.en_oferta ? payload.precio_oferta : null,
    })
    .eq('id', payload.id)
    .select()
    .single();

  assertNoError(error, 'Error al actualizar el insumo');
  if (options?.recalcular !== false) {
    await recalcularTodosLosCostos();
  }
  return normalizeInsumo(data as Insumo);
}

/** Recalcula costo de preparaciones y de todos los productos (como Excel). */
export async function recalcularTodosLosCostos(): Promise<void> {
  const { error } = await supabase.rpc('recalcular_todos_los_costos');
  if (error?.code === 'PGRST202') {
    throw new Error(
      'Ejecuta las migraciones 012 y 013 en Supabase para recálculo automático',
    );
  }
  assertNoError(error, 'Error al recalcular costos de todos los sabores');
}

export async function updateInsumosBatch(
  updates: InsumoUpdatePayload[],
): Promise<number> {
  let count = 0;
  for (const payload of updates) {
    await updateInsumo(payload, { recalcular: false });
    count += 1;
  }

  if (count > 0) {
    await recalcularTodosLosCostos();
  }

  return count;
}

/** @deprecated Usar updateInsumo */
export async function updateInsumoPrecio(
  id: string,
  precio: number,
): Promise<Insumo> {
  const row = await getInsumosRaw().then((list) => list.find((i) => i.id === id));
  return updateInsumo({
    id,
    precio,
    tamano_paquete: row?.tamano_paquete ?? 1,
    cantidad_actual: row?.cantidad_actual ?? 0,
    en_oferta: row?.en_oferta ?? false,
    precio_oferta: row?.precio_oferta ?? null,
  });
}

export async function createInsumo(input: {
  nombre: string;
  precio: number;
  unidad: string;
  tamano_paquete?: number;
  cantidad_actual?: number;
  en_oferta?: boolean;
  precio_oferta?: number | null;
}): Promise<Insumo> {
  const existentes = await getInsumosRaw();
  const clave = claveInsumo({
    nombre: input.nombre,
    unidad: input.unidad,
  } as Insumo);
  const duplicado = existentes.find((i) => claveInsumo(i) === clave);
  if (duplicado) {
    throw new Error(
      `Ya existe el insumo «${duplicado.nombre}» (${duplicado.unidad}). Edítalo en la lista.`,
    );
  }

  const { data, error } = await supabase
    .from('insumos')
    .insert({
      nombre: input.nombre.trim(),
      precio: input.precio,
      tamano_paquete:
        input.tamano_paquete != null && input.tamano_paquete > 0
          ? input.tamano_paquete
          : 1,
      unidad: normalizarUnidad(input.unidad),
      cantidad_actual: input.cantidad_actual ?? 0,
      en_oferta: input.en_oferta ?? false,
      precio_oferta: input.en_oferta ? (input.precio_oferta ?? null) : null,
    })
    .select()
    .single();

  assertNoError(error, 'Error al crear el insumo');
  return normalizeInsumo(data as Insumo);
}
