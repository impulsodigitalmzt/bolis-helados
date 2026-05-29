import { format, startOfMonth } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import type { ConfigNegocio, VistaReporteVentas } from '@/lib/types/database';
import {
  calcularMargenUnitario,
  calcularPuntoEquilibrio,
  calcularSemaforo,
  construirEscenarios,
  gastosFijosActivos,
  type EscenarioFinanciero,
  type MargenUnitario,
  type SemaforoFinanciero,
} from '@/lib/utils/proyeccionFinanciera';
import { getConfigNegocio } from './configNegocio';
import { getInventarioTerminado } from './inventario';
import { assertNoError } from './errors';
import { fetchReporteRows } from './reportes';

export interface InventarioSabor {
  sabor_id: string;
  sabor_nombre: string;
  tipo: string;
  precio_venta: number;
  total_producido: number;
  total_vendido: number;
  stock_disponible: number;
}

export interface ReporteUtilidadMensual {
  mes: string;
  periodo: string;
  ingresos_totales: number;
  costos_totales: number;
  utilidad_bruta: number;
  bolis_vendidos: number;
}

export interface UtilidadPeriodo {
  ingresos: number;
  costos: number;
  utilidadBruta: number;
  comisiones: number;
  gananciaNeta: number;
  bolisVendidos: number;
}

export interface ProductoEstrella {
  sabor_id: string;
  sabor_nombre: string;
  ganancia_neta: number;
  cantidad: number;
  ingreso: number;
}

export interface ProyeccionFinanciera {
  config: ConfigNegocio;
  gastosFijosMes: number;
  margen: MargenUnitario | null;
  puntoEquilibrioBolis: number | null;
  semaforo: SemaforoFinanciero;
  utilidadDespuesFijos: number;
  escenarios: EscenarioFinanciero[];
}

export interface TableroFinanciero {
  utilidadHoy: UtilidadPeriodo;
  utilidadMes: UtilidadPeriodo;
  productoEstrella: ProductoEstrella | null;
  inventario: InventarioSabor[];
  proyeccion: ProyeccionFinanciera;
}

function agregarUtilidad(rows: VistaReporteVentas[]): UtilidadPeriodo {
  return rows.reduce(
    (acc, row) => ({
      ingresos: acc.ingresos + row.ingreso,
      costos: acc.costos + row.costo_produccion,
      utilidadBruta:
        acc.utilidadBruta +
        (row.ingreso - row.costo_produccion),
      comisiones: acc.comisiones + row.comision,
      gananciaNeta: acc.gananciaNeta + row.ganancia_neta,
      bolisVendidos: acc.bolisVendidos + row.cantidad,
    }),
    {
      ingresos: 0,
      costos: 0,
      utilidadBruta: 0,
      comisiones: 0,
      gananciaNeta: 0,
      bolisVendidos: 0,
    },
  );
}

function calcularProductoEstrella(
  rows: VistaReporteVentas[],
): ProductoEstrella | null {
  const porSabor = new Map<
    string,
    { sabor_nombre: string; ganancia_neta: number; cantidad: number; ingreso: number }
  >();

  for (const row of rows) {
    const prev = porSabor.get(row.sabor_id) ?? {
      sabor_nombre: row.sabor_nombre,
      ganancia_neta: 0,
      cantidad: 0,
      ingreso: 0,
    };
    prev.ganancia_neta += row.ganancia_neta;
    prev.cantidad += row.cantidad;
    prev.ingreso += row.ingreso;
    porSabor.set(row.sabor_id, prev);
  }

  const sorted = [...porSabor.entries()].sort(
    (a, b) => b[1].ganancia_neta - a[1].ganancia_neta,
  );

  if (sorted.length === 0 || sorted[0][1].ganancia_neta <= 0) {
    return null;
  }

  const [sabor_id, data] = sorted[0];
  return {
    sabor_id,
    sabor_nombre: data.sabor_nombre,
    ganancia_neta: data.ganancia_neta,
    cantidad: data.cantidad,
    ingreso: data.ingreso,
  };
}

export async function getReporteUtilidadMensual(
  limit = 12,
): Promise<ReporteUtilidadMensual[]> {
  const { data, error } = await supabase
    .from('reporte_utilidad_mensual')
    .select('*')
    .order('mes', { ascending: false })
    .limit(limit);

  assertNoError(error, 'Error al cargar reporte de utilidad mensual');
  return (data ?? []) as ReporteUtilidadMensual[];
}

function construirProyeccion(
  utilidadMes: UtilidadPeriodo,
  config: ConfigNegocio,
): ProyeccionFinanciera {
  const gastosFijosMes = gastosFijosActivos(config);
  const margen = calcularMargenUnitario(utilidadMes);

  return {
    config,
    gastosFijosMes,
    margen,
    puntoEquilibrioBolis: calcularPuntoEquilibrio(gastosFijosMes, margen),
    semaforo: calcularSemaforo(utilidadMes, gastosFijosMes),
    utilidadDespuesFijos: utilidadMes.gananciaNeta - gastosFijosMes,
    escenarios: construirEscenarios(utilidadMes, config),
  };
}

export async function getTableroFinanciero(): Promise<TableroFinanciero> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const mesDesde = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [rowsHoy, rowsMes, inventario, config] = await Promise.all([
    fetchReporteRows({ from: today, to: today }),
    fetchReporteRows({ from: mesDesde, to: today }),
    getInventarioTerminado() as Promise<InventarioSabor[]>,
    getConfigNegocio(),
  ]);

  const utilidadMes = agregarUtilidad(rowsMes);

  return {
    utilidadHoy: agregarUtilidad(rowsHoy),
    utilidadMes,
    productoEstrella: calcularProductoEstrella(rowsMes),
    inventario,
    proyeccion: construirProyeccion(utilidadMes, config),
  };
}
