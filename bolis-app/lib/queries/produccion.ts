import { supabase } from '@/lib/supabaseClient';
import type {
  HistorialProduccion,
  Insumo,
  RecetaDetalle,
  Sabor,
} from '@/lib/types/database';
import { assertNoError } from './errors';
import { consumoFisicoInsumo } from '@/lib/utils/costoInsumo';
import { getRecetasBySabor } from './recetas';

export interface RegistrarProduccionInput {
  sabor_id: string;
  cantidad: number;
  fecha?: string;
}

export interface ConsumoInsumoPreview {
  insumo_id: string;
  nombre: string;
  unidad: string;
  consumo: number;
  stock_actual: number;
  suficiente: boolean;
}

function acumularConsumo(
  map: Map<string, ConsumoInsumoPreview>,
  insumo: Insumo,
  consumo: number,
) {
  const prev = map.get(insumo.id);
  if (prev) {
    prev.consumo += consumo;
    prev.suficiente = prev.stock_actual >= prev.consumo;
    return;
  }
  const stock = insumo.cantidad_actual ?? 0;
  map.set(insumo.id, {
    insumo_id: insumo.id,
    nombre: insumo.nombre,
    unidad: insumo.unidad,
    consumo,
    stock_actual: stock,
    suficiente: stock >= consumo,
  });
}

export async function calcularConsumoProduccion(
  cantidadBolis: number,
  rendimiento: number,
  lineas: RecetaDetalle[],
): Promise<ConsumoInsumoPreview[]> {
  if (cantidadBolis <= 0 || rendimiento <= 0 || lineas.length === 0) {
    return [];
  }

  const factor = cantidadBolis / rendimiento;
  const map = new Map<string, ConsumoInsumoPreview>();

  for (const linea of lineas) {
    if (linea.insumo_id && linea.insumo) {
      const consumo =
        consumoFisicoInsumo(linea.cantidad_usada, linea.medida_usada ?? 1) *
        factor;
      acumularConsumo(map, linea.insumo, consumo);
      continue;
    }

    if (linea.preparacion_sabor_id) {
      const subLineas = await getRecetasBySabor(linea.preparacion_sabor_id);
      const prepRend =
        linea.preparacion && linea.preparacion.rendimiento > 0
          ? linea.preparacion.rendimiento
          : 1;

      for (const sub of subLineas) {
        if (!sub.insumo_id || !sub.insumo) continue;
        const consumo =
          (linea.cantidad_usada *
            consumoFisicoInsumo(sub.cantidad_usada, sub.medida_usada ?? 1) *
            factor) /
          prepRend;
        acumularConsumo(map, sub.insumo, consumo);
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  );
}

export async function previewConsumoProduccion(
  sabor: Sabor,
  cantidadBolis: number,
): Promise<ConsumoInsumoPreview[]> {
  const lineas = await getRecetasBySabor(sabor.id);
  return calcularConsumoProduccion(
    cantidadBolis,
    sabor.rendimiento > 0 ? sabor.rendimiento : 1,
    lineas,
  );
}

export async function registrarProduccion(
  input: RegistrarProduccionInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_produccion', {
    p_sabor_id: input.sabor_id,
    p_cantidad: input.cantidad,
    p_fecha: input.fecha ?? new Date().toISOString().slice(0, 10),
  });

  if (error?.code === 'PGRST202' || error?.message?.includes('registrar_produccion')) {
    throw new Error(
      'Ejecuta las migraciones 004 y 010_preparaciones_recetas.sql en Supabase',
    );
  }

  assertNoError(error, 'Error al registrar la producción');

  return data as string;
}

export async function getHistorialProduccionReciente(
  limit = 10,
): Promise<HistorialProduccion[]> {
  const { data, error } = await supabase
    .from('historial_produccion')
    .select('*, sabor:sabores(id, nombre)')
    .order('created_at', { ascending: false })
    .limit(limit);

  assertNoError(error, 'Error al cargar historial de producción');
  return (data ?? []) as HistorialProduccion[];
}
