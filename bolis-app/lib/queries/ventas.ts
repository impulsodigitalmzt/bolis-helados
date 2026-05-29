import { supabase } from '@/lib/supabaseClient';
import type { InventarioProductoTerminado, Vendedora, Venta } from '@/lib/types/database';
import { filtrarYOrdenarSaboresPos } from '@/lib/utils/saboresPos';
import { assertNoError } from './errors';

export interface RegistrarVentaInput {
  sabor_id: string;
  cantidad?: number;
  fecha?: string;
  vendedora_id?: string | null;
}

export interface SaborPos extends InventarioProductoTerminado {}

export type SemaforoStock = 'verde' | 'naranja' | 'gris';

/** Semáforo de stock para tarjetas POS (datos de inventario_producto_terminado). */
export function semaforoStock(stock: number): SemaforoStock {
  if (stock <= 0) return 'gris';
  if (stock < 4) return 'naranja';
  return 'verde';
}

function isMissingTransaccionesHielera(error: {
  code?: string;
  message?: string;
} | null) {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.message?.includes('transacciones_hielera') ||
    error.message?.includes('stock_real_pos')
  );
}

/** Stock Real = Producción − Cargas + Retornos (día indicado). */
async function mapStockRealParaPos(
  sabores: SaborPos[],
  fecha: string,
): Promise<SaborPos[]> {
  const { data: transacciones, error } = await supabase
    .from('transacciones_hielera')
    .select('sabor_id, tipo, cantidad')
    .eq('fecha', fecha);

  if (error) {
    if (isMissingTransaccionesHielera(error)) {
      return sabores;
    }
    assertNoError(error, 'Error al cargar movimientos de hielera');
  }

  const cargas = new Map<string, number>();
  const retornos = new Map<string, number>();

  for (const row of transacciones ?? []) {
    const sid = row.sabor_id as string;
    const qty = Number(row.cantidad);
    if (row.tipo === 'carga') {
      cargas.set(sid, (cargas.get(sid) ?? 0) + qty);
    } else if (row.tipo === 'retorno') {
      retornos.set(sid, (retornos.get(sid) ?? 0) + qty);
    }
  }

  return sabores.map((sabor) => ({
    ...sabor,
    stock_disponible: Math.max(
      0,
      sabor.stock_disponible -
        (cargas.get(sabor.sabor_id) ?? 0) +
        (retornos.get(sabor.sabor_id) ?? 0),
    ),
  }));
}

export async function getSaboresParaPos(fecha?: string): Promise<SaborPos[]> {
  const fechaDia = fecha ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('inventario_producto_terminado')
    .select('*')
    .order('sabor_nombre');

  assertNoError(error, 'Error al cargar sabores para venta');
  const sabores = filtrarYOrdenarSaboresPos((data ?? []) as SaborPos[]);
  return mapStockRealParaPos(sabores, fechaDia);
}

/** Transacción atómica: venta + validación de inventario terminado */
export async function registrarVenta(input: RegistrarVentaInput): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_venta', {
    p_sabor_id: input.sabor_id,
    p_cantidad: input.cantidad ?? 1,
    p_fecha: input.fecha ?? new Date().toISOString().slice(0, 10),
    p_vendedora_id: input.vendedora_id ?? null,
  });

  if (error?.code === 'PGRST202' || error?.message?.includes('registrar_venta')) {
    throw new Error(
      'Ejecuta la migración 005_ventas_pos_finanzas.sql en Supabase',
    );
  }

  assertNoError(error, 'Error al registrar la venta');
  return data as string;
}

/** @deprecated Usar registrarVenta (RPC transaccional) */
export async function insertVenta(input: RegistrarVentaInput): Promise<Venta> {
  const id = await registrarVenta(input);
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .eq('id', id)
    .single();

  assertNoError(error, 'Error al cargar la venta registrada');
  return data as Venta;
}

export { getSabores } from './sabores';

export async function getVendedoras(): Promise<Vendedora[]> {
  const { data, error } = await supabase
    .from('vendedoras')
    .select('*')
    .order('nombre');

  assertNoError(error, 'Error al cargar vendedoras');
  return (data ?? []) as Vendedora[];
}
