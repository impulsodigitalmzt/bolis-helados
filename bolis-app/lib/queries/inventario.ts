import { supabase } from '@/lib/supabaseClient';
import type { InventarioProductoTerminado, Sabor } from '@/lib/types/database';
import { getSabores } from './sabores';
import { assertNoError } from './errors';

function isMissingInventarioView(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.message?.includes('inventario_producto_terminado') ||
    error.message?.includes('schema cache')
  );
}

/** Calcula inventario sin la vista (si falta migración 005) */
async function getInventarioFallback(): Promise<InventarioProductoTerminado[]> {
  const sabores = await getSabores();

  const [prodRes, ventasRes] = await Promise.all([
    supabase.from('historial_produccion').select('sabor_id, cantidad'),
    supabase.from('ventas').select('sabor_id, cantidad'),
  ]);

  if (prodRes.error?.code === 'PGRST205') {
    return sabores.map((s) => mapSaborSinHistorial(s));
  }

  assertNoError(prodRes.error, 'Error al cargar producción');
  assertNoError(ventasRes.error, 'Error al cargar ventas');

  const producido = new Map<string, number>();
  const vendido = new Map<string, number>();

  for (const row of prodRes.data ?? []) {
    const id = row.sabor_id as string;
    producido.set(id, (producido.get(id) ?? 0) + Number(row.cantidad));
  }

  for (const row of ventasRes.data ?? []) {
    const id = row.sabor_id as string;
    vendido.set(id, (vendido.get(id) ?? 0) + Number(row.cantidad));
  }

  return sabores.map((s) => {
    const total_producido = producido.get(s.id) ?? 0;
    const total_vendido = vendido.get(s.id) ?? 0;
    return {
      sabor_id: s.id,
      sabor_nombre: s.nombre,
      tipo: s.tipo,
      precio_venta: s.precio_venta,
      total_producido,
      total_vendido,
      stock_disponible: total_producido - total_vendido,
    };
  });
}

function mapSaborSinHistorial(s: Sabor): InventarioProductoTerminado {
  return {
    sabor_id: s.id,
    sabor_nombre: s.nombre,
    tipo: s.tipo,
    precio_venta: s.precio_venta,
    total_producido: 0,
    total_vendido: 0,
    stock_disponible: 0,
  };
}

export async function getInventarioTerminado(): Promise<
  InventarioProductoTerminado[]
> {
  const { data, error } = await supabase
    .from('inventario_producto_terminado')
    .select('*')
    .order('sabor_nombre');

  if (isMissingInventarioView(error)) {
    return getInventarioFallback();
  }

  assertNoError(error, 'Error al cargar inventario de producto terminado');
  return (data ?? []) as InventarioProductoTerminado[];
}
