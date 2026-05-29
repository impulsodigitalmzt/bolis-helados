import { supabase } from '@/lib/supabaseClient';
import type { Sabor } from '@/lib/types/database';
import { esNombrePreparacion } from '@/lib/utils/preparaciones';
import { assertNoError } from './errors';

function normalizeSabor(row: Sabor): Sabor {
  return {
    ...row,
    rendimiento: row.rendimiento > 0 ? row.rendimiento : 1,
    es_preparacion: row.es_preparacion ?? esNombrePreparacion(row.nombre),
  };
}

export async function getSabores(): Promise<Sabor[]> {
  const { data, error } = await supabase
    .from('sabores')
    .select('*')
    .order('nombre');

  assertNoError(error, 'Error al cargar sabores');
  return ((data ?? []) as Sabor[]).map(normalizeSabor);
}

export async function getPreparaciones(): Promise<Sabor[]> {
  const sabores = await getSabores();
  return sabores.filter((s) => s.es_preparacion);
}

export async function getSaborById(id: string): Promise<Sabor | null> {
  const { data, error } = await supabase
    .from('sabores')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  assertNoError(error, 'Error al cargar el sabor');
  const row = data as Sabor | null;
  return row ? normalizeSabor(row) : null;
}

/** Solo precio de venta; el costo lo calculan las recetas + triggers */
export async function updateSaborPrecioVenta(
  id: string,
  precio_venta: number,
): Promise<Sabor> {
  const { data, error } = await supabase
    .from('sabores')
    .update({ precio_venta })
    .eq('id', id)
    .select()
    .single();

  assertNoError(error, 'Error al actualizar el sabor');
  return data as Sabor;
}
