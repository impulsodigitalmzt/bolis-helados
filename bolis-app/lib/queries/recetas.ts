import { supabase } from '@/lib/supabaseClient';
import type { Insumo, Receta, RecetaDetalle, Sabor } from '@/lib/types/database';
import { costoLineaInsumo } from '@/lib/utils/costoInsumo';
import { assertNoError } from './errors';

type RecetaRow = Receta & {
  insumo: Insumo | null;
  preparacion: Sabor | null;
};

function mapRecetaDetalle(row: RecetaRow): RecetaDetalle {
  if (row.preparacion_sabor_id && row.preparacion) {
    const preparacion = {
      ...row.preparacion,
      rendimiento:
        row.preparacion.rendimiento > 0 ? row.preparacion.rendimiento : 1,
      es_preparacion: row.preparacion.es_preparacion ?? true,
    };
    const costo_linea =
      row.cantidad_usada * preparacion.costo_produccion_unitario;
    return {
      ...row,
      medida_usada: row.medida_usada ?? 1,
      insumo_id: null,
      insumo: null,
      preparacion,
      costo_linea,
    };
  }

  const insumo = row.insumo
    ? {
        ...row.insumo,
        en_oferta: row.insumo.en_oferta ?? false,
        precio_oferta: row.insumo.precio_oferta ?? null,
      }
    : null;
  const costo_linea = costoLineaInsumo(
    row.cantidad_usada,
    insumo,
    row.medida_usada ?? 1,
  );

  return {
    ...row,
    medida_usada: row.medida_usada ?? 1,
    preparacion_sabor_id: null,
    preparacion: null,
    insumo,
    costo_linea,
  };
}

export async function getRecetasBySabor(saborId: string): Promise<RecetaDetalle[]> {
  const { data, error } = await supabase
    .from('recetas')
    .select('*, insumo:insumos(*), preparacion:sabores!recetas_preparacion_sabor_id_fkey(*)')
    .eq('sabor_id', saborId)
    .order('created_at');

  if (error?.message?.includes('recetas_preparacion_sabor_id_fkey')) {
    const { data: data2, error: error2 } = await supabase
      .from('recetas')
      .select('*, insumo:insumos(*)')
      .eq('sabor_id', saborId)
      .order('created_at');
    assertNoError(error2, 'Error al cargar la receta');
    return ((data2 ?? []) as RecetaRow[]).map(mapRecetaDetalle);
  }

  assertNoError(error, 'Error al cargar la receta');
  return ((data ?? []) as RecetaRow[]).map(mapRecetaDetalle);
}

export async function recalcularCostoSabor(saborId: string): Promise<void> {
  const { error } = await supabase.rpc('recalcular_costo_sabor', {
    p_sabor_id: saborId,
  });
  assertNoError(error, 'Error al recalcular el costo del sabor');
}

export function calcularCostoReceta(lineas: RecetaDetalle[]): number {
  return lineas.reduce((sum, l) => sum + l.costo_linea, 0);
}

export function costoParcialLinea(
  insumo: Insumo | undefined | null,
  cantidadUsada: number,
  medidaUsada = 1,
): number {
  return costoLineaInsumo(cantidadUsada, insumo ?? undefined, medidaUsada);
}

export function costoParcialPreparacion(
  preparacion: Sabor | undefined | null,
  lotes: number,
): number {
  if (!preparacion || lotes <= 0) return 0;
  return lotes * preparacion.costo_produccion_unitario;
}

export interface RecetaLineaInput {
  insumo_id?: string;
  preparacion_sabor_id?: string;
  cantidad_usada: number;
  medida_usada?: number;
}

export interface GuardarRecetaInput {
  sabor_id: string;
  nombre: string;
  rendimiento: number;
  lineas: RecetaLineaInput[];
}

/** Guardado transaccional: nombre, rendimiento, borrar recetas e insertar nuevas */
export async function guardarRecetaCompleta(
  input: GuardarRecetaInput,
): Promise<void> {
  const { error } = await supabase.rpc('guardar_receta_sabor', {
    p_sabor_id: input.sabor_id,
    p_nombre: input.nombre.trim(),
    p_rendimiento: input.rendimiento,
    p_lineas: input.lineas,
  });

  if (error?.code === 'PGRST202' || error?.message?.includes('guardar_receta_sabor')) {
    throw new Error(
      'Ejecuta las migraciones 003, 010 y 013 en Supabase',
    );
  }
  assertNoError(error, 'Error al guardar la receta');
}
