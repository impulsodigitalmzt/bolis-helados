import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfMonth,
  subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import type { VistaReporteVentas } from '@/lib/types/database';
import type { DashboardKpis } from './dashboard';
import { assertNoError } from './errors';

export interface DateRange {
  from: string;
  to: string;
}

export interface VentaDiaria {
  fecha: string;
  label: string;
  ingreso: number;
  gananciaNeta: number;
  cantidad: number;
}

export interface SaborCantidad {
  saborId: string;
  saborNombre: string;
  cantidad: number;
}

export interface SaborUtilidad {
  saborId: string;
  saborNombre: string;
  cantidad: number;
  gananciaNeta: number;
}

export interface ReportesData {
  range: DateRange;
  kpis: DashboardKpis;
  ventasDiarias: VentaDiaria[];
  saboresCantidad: SaborCantidad[];
  saboresUtilidad: SaborUtilidad[];
}

export function getDefaultDateRange(): DateRange {
  const today = new Date();
  return {
    from: format(startOfMonth(today), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  };
}

export function getPresetRange(preset: '7d' | '30d' | 'mes' | 'todo'): DateRange {
  const today = new Date();
  const to = format(today, 'yyyy-MM-dd');

  if (preset === 'todo') {
    return { from: '2020-01-01', to };
  }
  if (preset === '7d') {
    return { from: format(subDays(today, 6), 'yyyy-MM-dd'), to };
  }
  if (preset === '30d') {
    return { from: format(subDays(today, 29), 'yyyy-MM-dd'), to };
  }
  return {
    from: format(startOfMonth(today), 'yyyy-MM-dd'),
    to,
  };
}

export async function fetchReporteRows(
  range: DateRange,
): Promise<VistaReporteVentas[]> {
  let query = supabase
    .from('vista_reporte_ventas')
    .select('*')
    .gte('fecha', range.from)
    .lte('fecha', range.to)
    .order('fecha', { ascending: true });

  const { data, error } = await query;
  assertNoError(error, 'Error al cargar vista_reporte_ventas');
  return (data ?? []) as VistaReporteVentas[];
}

export function buildReportesData(
  rows: VistaReporteVentas[],
  range: DateRange,
): ReportesData {
  const kpis: DashboardKpis = {
    ingresosTotales: 0,
    costosProduccion: 0,
    comisionesPagadas: 0,
    gananciaNeta: 0,
    totalBolis: 0,
  };

  const porDia = new Map<
    string,
    { ingreso: number; gananciaNeta: number; cantidad: number }
  >();
  const porSabor = new Map<
    string,
    { saborId: string; saborNombre: string; cantidad: number }
  >();
  const porSaborUtilidad = new Map<
    string,
    { saborId: string; saborNombre: string; cantidad: number; gananciaNeta: number }
  >();

  for (const row of rows) {
    kpis.ingresosTotales += row.ingreso;
    kpis.costosProduccion += row.costo_produccion;
    kpis.comisionesPagadas += row.comision;
    kpis.gananciaNeta += row.ganancia_neta;
    kpis.totalBolis += row.cantidad;

    const dia = porDia.get(row.fecha) ?? {
      ingreso: 0,
      gananciaNeta: 0,
      cantidad: 0,
    };
    dia.ingreso += row.ingreso;
    dia.gananciaNeta += row.ganancia_neta;
    dia.cantidad += row.cantidad;
    porDia.set(row.fecha, dia);

    const sabor = porSabor.get(row.sabor_id) ?? {
      saborId: row.sabor_id,
      saborNombre: row.sabor_nombre,
      cantidad: 0,
    };
    sabor.cantidad += row.cantidad;
    porSabor.set(row.sabor_id, sabor);

    const saborU = porSaborUtilidad.get(row.sabor_id) ?? {
      saborId: row.sabor_id,
      saborNombre: row.sabor_nombre,
      cantidad: 0,
      gananciaNeta: 0,
    };
    saborU.cantidad += row.cantidad;
    saborU.gananciaNeta += row.ganancia_neta;
    porSaborUtilidad.set(row.sabor_id, saborU);
  }

  const fromDate = parseISO(range.from);
  const toDate = parseISO(range.to);
  const dias = eachDayOfInterval({ start: fromDate, end: toDate });

  const ventasDiarias: VentaDiaria[] = dias.map((d) => {
    const fecha = format(d, 'yyyy-MM-dd');
    const agg = porDia.get(fecha);
    return {
      fecha,
      label: format(d, 'd MMM', { locale: es }),
      ingreso: agg?.ingreso ?? 0,
      gananciaNeta: agg?.gananciaNeta ?? 0,
      cantidad: agg?.cantidad ?? 0,
    };
  });

  const saboresCantidad = [...porSabor.values()].sort(
    (a, b) => b.cantidad - a.cantidad,
  );

  const saboresUtilidad = [...porSaborUtilidad.values()]
    .map((s) => ({
      saborId: s.saborId,
      saborNombre: s.saborNombre,
      cantidad: s.cantidad,
      gananciaNeta: s.gananciaNeta,
    }))
    .sort((a, b) => b.gananciaNeta - a.gananciaNeta);

  return {
    range,
    kpis,
    ventasDiarias,
    saboresCantidad,
    saboresUtilidad,
  };
}

export async function getReportesData(range: DateRange): Promise<ReportesData> {
  const rows = await fetchReporteRows(range);
  return buildReportesData(rows, range);
}
