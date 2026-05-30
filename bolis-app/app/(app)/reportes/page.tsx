import { ReportesOrganizer } from '@/components/reportes/ReportesOrganizer';
import { PageHeader } from '@/components/layout/PageHeader';
import { CONFIG_NEGOCIO_DEFAULT } from '@/lib/queries/configNegocio';
import { getAlertasYCompras } from '@/lib/queries/gestionInteligente';
import {
  getTableroFinanciero,
  type TableroFinanciero as TableroFinancieroData,
} from '@/lib/queries/finanzas';
import { construirEscenarios } from '@/lib/utils/proyeccionFinanciera';
import {
  getDefaultDateRange,
  getReportesData,
} from '@/lib/queries/reportes';

const tableroVacio: TableroFinancieroData = {
  utilidadHoy: {
    ingresos: 0,
    costos: 0,
    utilidadBruta: 0,
    comisiones: 0,
    gananciaNeta: 0,
    bolisVendidos: 0,
  },
  utilidadMes: {
    ingresos: 0,
    costos: 0,
    utilidadBruta: 0,
    comisiones: 0,
    gananciaNeta: 0,
    bolisVendidos: 0,
  },
  productoEstrella: null,
  inventario: [],
  proyeccion: {
    config: CONFIG_NEGOCIO_DEFAULT,
    gastosFijosMes: 0,
    margen: null,
    puntoEquilibrioBolis: null,
    semaforo: 'rojo' as const,
    utilidadDespuesFijos: 0,
    escenarios: construirEscenarios(
      {
        ingresos: 0,
        costos: 0,
        utilidadBruta: 0,
        comisiones: 0,
        gananciaNeta: 0,
        bolisVendidos: 0,
      },
      CONFIG_NEGOCIO_DEFAULT,
    ),
  },
};

export default async function ReportesPage() {
  const defaultRange = getDefaultDateRange();
  let ventas;
  let tablero: TableroFinancieroData = tableroVacio;
  let alertas = {
    sugerencias: [],
    proximosAgotarse: [],
    sugerenciaCompra: [],
    logsRecientes: [],
  } as Awaited<ReturnType<typeof getAlertasYCompras>>;
  let errorMessage: string | null = null;

  try {
    ventas = await getReportesData(defaultRange);
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : 'No se pudo cargar los reportes';
    ventas = {
      range: defaultRange,
      kpis: {
        ingresosTotales: 0,
        costosProduccion: 0,
        comisionesPagadas: 0,
        gananciaNeta: 0,
        totalBolis: 0,
      },
      ventasDiarias: [],
      saboresCantidad: [],
      saboresUtilidad: [],
    };
  }

  try {
    tablero = await getTableroFinanciero();
  } catch {
    /* tablero opcional si faltan vistas */
  }

  try {
    alertas = await getAlertasYCompras();
  } catch {
    /* alertas opcional si falta migración 007 */
  }

  return (
    <>
      <PageHeader title="Reportes" compact className="no-print hidden md:block md:mb-3" />

      {errorMessage ? (
        <div className="alert-warning no-print mb-3">{errorMessage}</div>
      ) : null}

      <ReportesOrganizer tablero={tablero} alertas={alertas} ventas={ventas} />
    </>
  );
}
