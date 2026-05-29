import { supabase } from '@/lib/supabaseClient';
import type { VistaReporteVentas } from '@/lib/types/database';
import { assertNoError } from './errors';

export type DashboardPeriod = 'hoy' | 'semana' | 'mes' | 'todo';

export interface DashboardKpis {
  ingresosTotales: number;
  costosProduccion: number;
  comisionesPagadas: number;
  gananciaNeta: number;
  totalBolis: number;
}

export interface SaborRanking {
  saborId: string;
  saborNombre: string;
  cantidad: number;
  ingreso: number;
}

export interface VendedoraRendimiento {
  vendedoraId: string;
  vendedoraNombre: string;
  cantidad: number;
  ingreso: number;
  comision: number;
  gananciaNeta: number;
}

export interface DashboardMetrics {
  period: DashboardPeriod;
  kpis: DashboardKpis;
  topSabores: SaborRanking[];
  rendimientoVendedoras: VendedoraRendimiento[];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getPeriodDateRange(period: DashboardPeriod): {
  from: string | null;
  to: string | null;
} {
  const today = startOfDay(new Date());
  const to = toISODate(today);

  if (period === 'todo') {
    return { from: null, to: null };
  }

  if (period === 'hoy') {
    return { from: to, to };
  }

  if (period === 'semana') {
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 6);
    return { from: toISODate(fromDate), to };
  }

  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: toISODate(fromDate), to };
}

async function fetchResumenRows(
  period: DashboardPeriod,
): Promise<VistaReporteVentas[]> {
  const { from, to } = getPeriodDateRange(period);

  let query = supabase
    .from('vista_reporte_ventas')
    .select('*')
    .order('fecha', { ascending: false });

  if (from) query = query.gte('fecha', from);
  if (to) query = query.lte('fecha', to);

  const { data, error } = await query;
  assertNoError(error, 'Error al cargar vista_reporte_ventas');
  return (data ?? []) as VistaReporteVentas[];
}

function aggregateMetrics(
  rows: VistaReporteVentas[],
  period: DashboardPeriod,
): DashboardMetrics {
  const kpis: DashboardKpis = {
    ingresosTotales: 0,
    costosProduccion: 0,
    comisionesPagadas: 0,
    gananciaNeta: 0,
    totalBolis: 0,
  };

  const saboresMap = new Map<string, SaborRanking>();
  const vendedorasMap = new Map<string, VendedoraRendimiento>();

  for (const row of rows) {
    kpis.ingresosTotales += row.ingreso;
    kpis.costosProduccion += row.costo_produccion;
    kpis.comisionesPagadas += row.comision;
    kpis.gananciaNeta += row.ganancia_neta;
    kpis.totalBolis += row.cantidad;

    const sabor = saboresMap.get(row.sabor_id) ?? {
      saborId: row.sabor_id,
      saborNombre: row.sabor_nombre,
      cantidad: 0,
      ingreso: 0,
    };
    sabor.cantidad += row.cantidad;
    sabor.ingreso += row.ingreso;
    saboresMap.set(row.sabor_id, sabor);

    if (!row.vendedora_id) continue;

    const vendedora = vendedorasMap.get(row.vendedora_id) ?? {
      vendedoraId: row.vendedora_id,
      vendedoraNombre: row.vendedora_nombre,
      cantidad: 0,
      ingreso: 0,
      comision: 0,
      gananciaNeta: 0,
    };
    vendedora.cantidad += row.cantidad;
    vendedora.ingreso += row.ingreso;
    vendedora.comision += row.comision;
    vendedora.gananciaNeta += row.ganancia_neta;
    vendedorasMap.set(row.vendedora_id, vendedora);
  }

  const topSabores = [...saboresMap.values()]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  const rendimientoVendedoras = [...vendedorasMap.values()].sort(
    (a, b) => b.gananciaNeta - a.gananciaNeta,
  );

  return {
    period,
    kpis,
    topSabores,
    rendimientoVendedoras,
  };
}

export async function getDashboardMetrics(
  period: DashboardPeriod = 'mes',
): Promise<DashboardMetrics> {
  const rows = await fetchResumenRows(period);
  return aggregateMetrics(rows, period);
}
