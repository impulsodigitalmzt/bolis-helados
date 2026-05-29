import { supabase } from '@/lib/supabaseClient';
import { filtrarYOrdenarSaboresPos } from '@/lib/utils/saboresPos';
import { getInventarioTerminado } from './inventario';
import { assertNoError } from './errors';

export interface SaborHieleraPos {
  sabor_id: string;
  sabor_nombre: string;
  tipo: string;
  precio_venta: number;
  costo_produccion_unitario: number;
  es_preparacion: boolean;
  stock_produccion: number;
  stock_hielera: number;
  stock_almacen: number;
  total_producido: number;
  total_vendido: number;
}

export interface LineaCargaHielera {
  sabor_id: string;
  cantidad: number;
}

export interface LineaVentaTicket {
  sabor_id: string;
  cantidad: number;
}

function isMissingHieleraSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.message?.includes('hielera_stock_dia') ||
    error.message?.includes('inventario_pos_hielera') ||
    error.message?.includes('transacciones_hielera') ||
    error.message?.includes('cargar_hielera') ||
    error.message?.includes('registrar_retorno') ||
    error.message?.includes('registrar_venta_ticket')
  );
}

export async function getSaboresHieleraPos(
  fecha: string,
): Promise<SaborHieleraPos[]> {
  const { data: viewData, error: viewError } = await supabase
    .from('inventario_pos_hielera')
    .select('*')
    .order('sabor_nombre');

  if (!viewError && viewData?.length) {
    const withHielera = await attachHieleraStockForDate(
      viewData as SaborHieleraPos[],
      fecha,
    );
    return applyStockRealHielera(withHielera, fecha);
  }

  if (viewError && !isMissingHieleraSchema(viewError)) {
    assertNoError(viewError, 'Error al cargar inventario POS');
  }

  const inventario = await getInventarioTerminado();
  const invMap = new Map(inventario.map((i) => [i.sabor_id, i]));

  let hieleraMap = new Map<string, number>();
  const { data: hieleraRows, error: hieleraError } = await supabase
    .from('hielera_stock_dia')
    .select('sabor_id, cantidad')
    .eq('fecha', fecha);

  if (hieleraError && !isMissingHieleraSchema(hieleraError)) {
    assertNoError(hieleraError, 'Error al cargar stock de hielera');
  } else {
    hieleraMap = new Map(
      (hieleraRows ?? []).map((r) => [r.sabor_id as string, Number(r.cantidad)]),
    );
  }

  const items: SaborHieleraPos[] = inventario.map((inv) => {
    const stock_hielera = hieleraMap.get(inv.sabor_id) ?? 0;
    const stock_produccion = inv.stock_disponible;
    return {
      sabor_id: inv.sabor_id,
      sabor_nombre: inv.sabor_nombre,
      tipo: inv.tipo,
      precio_venta: inv.precio_venta,
      costo_produccion_unitario: 0,
      es_preparacion: false,
      stock_produccion,
      stock_hielera,
      stock_almacen: Math.max(0, stock_produccion - stock_hielera),
      total_producido: inv.total_producido,
      total_vendido: inv.total_vendido,
    };
  });

  return applyStockRealHielera(items, fecha);
}

async function applyStockRealHielera(
  items: SaborHieleraPos[],
  fecha: string,
): Promise<SaborHieleraPos[]> {
  const { data: transacciones, error } = await supabase
    .from('transacciones_hielera')
    .select('sabor_id, tipo, cantidad')
    .eq('fecha', fecha);

  if (error) {
    if (isMissingHieleraSchema(error)) {
      return filtrarYOrdenarSaboresPos(items);
    }
    assertNoError(error, 'Error al cargar transacciones de hielera');
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

  const mapped = items.map((item) => {
    const stock_almacen = Math.max(
      0,
      item.stock_produccion -
        (cargas.get(item.sabor_id) ?? 0) +
        (retornos.get(item.sabor_id) ?? 0),
    );
    return { ...item, stock_almacen };
  });

  return filtrarYOrdenarSaboresPos(mapped);
}

async function attachHieleraStockForDate(
  items: SaborHieleraPos[],
  fecha: string,
): Promise<SaborHieleraPos[]> {
  if (fecha === new Date().toISOString().slice(0, 10)) {
    return items;
  }

  const { data, error } = await supabase
    .from('hielera_stock_dia')
    .select('sabor_id, cantidad')
    .eq('fecha', fecha);

  if (error || !data?.length) {
    return items;
  }

  const map = new Map(data.map((r) => [r.sabor_id as string, Number(r.cantidad)]));

  return items.map((item) => {
    const stock_hielera = map.get(item.sabor_id) ?? 0;
    return {
      ...item,
      stock_hielera,
      stock_almacen: Math.max(0, item.stock_produccion - stock_hielera),
    };
  });
}

export async function cargarHielera(input: {
  fecha: string;
  lineas: LineaCargaHielera[];
  vendedora_id?: string | null;
  notas?: string;
}): Promise<void> {
  const lineas = input.lineas.filter((l) => l.cantidad > 0);
  if (lineas.length === 0) {
    throw new Error('Indica al menos un sabor para cargar en la hielera.');
  }

  const { error } = await supabase.rpc('cargar_hielera', {
    p_fecha: input.fecha,
    p_lineas: lineas,
    p_vendedora_id: input.vendedora_id ?? null,
    p_notas: input.notas ?? null,
  });

  if (isMissingHieleraSchema(error)) {
    throw new Error(
      'Ejecuta la migración 028_hielera_inventario_pos.sql en Supabase SQL Editor.',
    );
  }

  assertNoError(error, 'Error al cargar la hielera');
}

/** Cierre de jornada: devuelve sobrantes de la hielera al almacén. */
export async function registrarRetorno(input: {
  sabor_id: string;
  cantidad_sobrante: number;
  fecha: string;
}): Promise<void> {
  if (input.cantidad_sobrante <= 0) {
    throw new Error('Indica una cantidad de sobrante mayor que cero.');
  }

  const { error } = await supabase.rpc('registrar_retorno', {
    p_sabor_id: input.sabor_id,
    p_cantidad_sobrante: input.cantidad_sobrante,
    p_fecha: input.fecha,
  });

  if (isMissingHieleraSchema(error)) {
    throw new Error(
      'Ejecuta la migración 030_transacciones_hielera.sql en Supabase SQL Editor.',
    );
  }

  assertNoError(error, 'Error al registrar el retorno de hielera');
}

export async function registrarVentaTicket(input: {
  fecha: string;
  lineas: LineaVentaTicket[];
  vendedora_id?: string | null;
}): Promise<string> {
  const lineas = input.lineas.filter((l) => l.cantidad > 0);
  if (lineas.length === 0) {
    throw new Error('El ticket está vacío.');
  }

  const { data, error } = await supabase.rpc('registrar_venta_ticket', {
    p_fecha: input.fecha,
    p_lineas: lineas,
    p_vendedora_id: input.vendedora_id ?? null,
  });

  if (isMissingHieleraSchema(error)) {
    throw new Error(
      'Ejecuta las migraciones 028 y 029 en Supabase SQL Editor.',
    );
  }

  assertNoError(error, 'Error al registrar la venta');
  return data as string;
}

export interface TicketRecienteLinea {
  id: string;
  sabor_id: string;
  sabor_nombre: string;
  cantidad: number;
  precio_venta_unitario: number;
}

export interface TicketReciente {
  id: string;
  fecha: string;
  total_ingreso: number;
  created_at: string;
  lineas: TicketRecienteLinea[];
}

export async function getTicketsRecientes(
  fecha: string,
  limit = 8,
): Promise<TicketReciente[]> {
  const { data: tickets, error } = await supabase
    .from('ventas_ticket')
    .select('id, fecha, total_ingreso, created_at')
    .eq('fecha', fecha)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error?.code === 'PGRST205') return [];
  assertNoError(error, 'Error al cargar ventas recientes');

  if (!tickets?.length) return [];

  const ids = tickets.map((t) => t.id as string);
  const { data: detalle, error: detError } = await supabase
    .from('detalle_ventas')
    .select('id, ticket_id, sabor_id, cantidad, precio_venta_unitario')
    .in('ticket_id', ids);

  if (detError?.code === 'PGRST205') {
    return tickets.map((t) => ({
      id: t.id as string,
      fecha: t.fecha as string,
      total_ingreso: Number(t.total_ingreso),
      created_at: t.created_at as string,
      lineas: [],
    }));
  }
  assertNoError(detError, 'Error al cargar detalle de ventas');

  const saborIds = [...new Set((detalle ?? []).map((d) => d.sabor_id as string))];
  const { data: saboresRows } = await supabase
    .from('sabores')
    .select('id, nombre')
    .in('id', saborIds);

  const nombreMap = new Map(
    (saboresRows ?? []).map((s) => [s.id as string, s.nombre as string]),
  );

  const lineasByTicket = new Map<string, TicketRecienteLinea[]>();
  for (const d of detalle ?? []) {
    const tid = d.ticket_id as string;
    const list = lineasByTicket.get(tid) ?? [];
    list.push({
      id: d.id as string,
      sabor_id: d.sabor_id as string,
      sabor_nombre: nombreMap.get(d.sabor_id as string) ?? 'Sabor',
      cantidad: Number(d.cantidad),
      precio_venta_unitario: Number(d.precio_venta_unitario),
    });
    lineasByTicket.set(tid, list);
  }

  return tickets.map((t) => ({
    id: t.id as string,
    fecha: t.fecha as string,
    total_ingreso: Number(t.total_ingreso),
    created_at: t.created_at as string,
    lineas: lineasByTicket.get(t.id as string) ?? [],
  }));
}

export async function corregirVentaTicket(input: {
  ticket_id: string;
  lineas: LineaVentaTicket[];
  vendedora_id?: string | null;
}): Promise<string> {
  const lineas = input.lineas.filter((l) => l.cantidad > 0);
  if (lineas.length === 0) {
    throw new Error('La venta corregida debe tener al menos un producto.');
  }

  const { data, error } = await supabase.rpc('corregir_venta_ticket', {
    p_ticket_id: input.ticket_id,
    p_lineas: lineas,
    p_vendedora_id: input.vendedora_id ?? null,
  });

  if (error?.message?.includes('corregir_venta_ticket')) {
    throw new Error(
      'Ejecuta la migración 029_venta_auto_carga_y_correccion.sql en Supabase.',
    );
  }

  assertNoError(error, 'Error al corregir la venta');
  return data as string;
}

export async function cargarHieleraTodo(fecha: string): Promise<number> {
  const { data, error } = await supabase.rpc('cargar_hielera_todo', {
    p_fecha: fecha,
  });

  if (error?.message?.includes('cargar_hielera_todo')) {
    throw new Error(
      'Ejecuta la migración 029_venta_auto_carga_y_correccion.sql en Supabase.',
    );
  }

  assertNoError(error, 'Error al cargar hielera');
  return Number(data ?? 0);
}
