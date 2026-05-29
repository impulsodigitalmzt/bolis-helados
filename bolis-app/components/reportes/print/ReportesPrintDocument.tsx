import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AlertasYComprasData } from '@/lib/queries/gestionInteligente';
import type { TableroFinanciero } from '@/lib/queries/finanzas';
import type { DateRange, ReportesData } from '@/lib/queries/reportes';
import type { SugerenciaCompra, UrgenciaSugerencia } from '@/lib/types/database';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import type { SemaforoFinanciero } from '@/lib/utils/proyeccionFinanciera';

export type ReportesPrintScope = 'finanzas' | 'inventario' | 'ventas' | 'all';

const URGENCIA_LABEL: Record<UrgenciaSugerencia, string> = {
  critico: 'Crítico',
  alerta: 'Alerta',
  ok: 'OK',
  sin_ritmo: 'Sin ritmo',
};

const SEMAFORO_LABEL: Record<SemaforoFinanciero, string> = {
  verde: 'Verde — Negocio rentable',
  amarillo: 'Amarillo — Cubres producción, no gastos fijos',
  rojo: 'Rojo — Pérdida operativa',
};

const SCOPE_TITLE: Record<ReportesPrintScope, string> = {
  finanzas: 'Reporte financiero',
  inventario: 'Reporte de inventario y compras',
  ventas: 'Reporte de ventas',
  all: 'Reporte completo',
};

export interface ReportesPrintDocumentProps {
  scope: ReportesPrintScope;
  printedAt: Date;
  tablero: TableroFinanciero;
  alertas: AlertasYComprasData;
  ventas: ReportesData;
}

function formatRange(range: DateRange): string {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  return `${format(from, "d 'de' MMM yyyy", { locale: es })} – ${format(to, "d 'de' MMM yyyy", { locale: es })}`;
}

function formatQty(value: number, unidad: string): string {
  const n = Number(value);
  const formatted =
    n % 1 === 0 ? formatNumber(n) : n.toFixed(3).replace(/\.?0+$/, '');
  return `${formatted} ${unidad}`;
}

function PrintHeader({
  title,
  printedAt,
  subtitle,
}: {
  title: string;
  printedAt: Date;
  subtitle?: string;
}) {
  return (
    <header className="print-header">
      <p className="print-brand">Bolis — Reportes</p>
      <h1 className="print-title">{title}</h1>
      {subtitle ? <p className="print-subtitle">{subtitle}</p> : null}
      <p className="print-meta">
        Impreso:{' '}
        {format(printedAt, "EEEE d 'de' MMMM yyyy, HH:mm", { locale: es })}
      </p>
    </header>
  );
}

function PrintSection({
  title,
  children,
  breakAfter = false,
}: {
  title: string;
  children: ReactNode;
  breakAfter?: boolean;
}) {
  return (
    <section
      className={`print-section${breakAfter ? ' print-section--break' : ''}`}
    >
      <h2 className="print-section-title">{title}</h2>
      {children}
    </section>
  );
}

function PrintTable({
  headers,
  rows,
  emptyMessage = 'Sin datos',
}: {
  headers: string[];
  rows: (string | number)[][];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="print-empty">{emptyMessage}</p>;
  }
  return (
    <table className="print-table">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function utilidadRows(
  label: string,
  u: TableroFinanciero['utilidadHoy'],
): (string | number)[][] {
  return [
    [
      label,
      formatCurrency(u.ingresos),
      formatCurrency(u.costos),
      formatCurrency(u.utilidadBruta),
      formatCurrency(u.comisiones),
      formatCurrency(u.gananciaNeta),
      formatNumber(u.bolisVendidos),
    ],
  ];
}

function FinanzasPrint({ tablero }: { tablero: TableroFinanciero }) {
  const { utilidadHoy, utilidadMes, productoEstrella, inventario, proyeccion } =
    tablero;
  const conStock = inventario.filter((i) => i.stock_disponible > 0);

  return (
    <>
      <PrintSection title="Resumen de utilidad">
        <PrintTable
          headers={[
            'Período',
            'Ingresos',
            'Costos',
            'Util. bruta',
            'Comisiones',
            'Ganancia neta',
            'Bolis',
          ]}
          rows={[
            ...utilidadRows('Hoy', utilidadHoy),
            ...utilidadRows('Mes actual', utilidadMes),
          ]}
        />
      </PrintSection>

      {productoEstrella ? (
        <PrintSection title="Producto estrella (mes)">
          <PrintTable
            headers={['Sabor', 'Cantidad', 'Ingreso', 'Ganancia neta']}
            rows={[
              [
                productoEstrella.sabor_nombre,
                formatNumber(productoEstrella.cantidad),
                formatCurrency(productoEstrella.ingreso),
                formatCurrency(productoEstrella.ganancia_neta),
              ],
            ]}
          />
        </PrintSection>
      ) : null}

      <PrintSection title="Semáforo financiero">
        <p className="print-lead">{SEMAFORO_LABEL[proyeccion.semaforo]}</p>
        <PrintTable
          headers={['Concepto', 'Valor']}
          rows={[
            ['Gastos fijos del mes', formatCurrency(proyeccion.gastosFijosMes)],
            [
              'Ganancia neta del mes',
              formatCurrency(utilidadMes.gananciaNeta),
            ],
            [
              'Utilidad después de fijos',
              formatCurrency(proyeccion.utilidadDespuesFijos),
            ],
            [
              'Punto de equilibrio (bolis/mes)',
              proyeccion.puntoEquilibrioBolis != null
                ? formatNumber(proyeccion.puntoEquilibrioBolis)
                : '—',
            ],
            ...(proyeccion.margen
              ? [
                  [
                    'Precio promedio',
                    formatCurrency(proyeccion.margen.precioPromedio),
                  ],
                  [
                    'Costo variable unitario',
                    formatCurrency(proyeccion.margen.costoVariableUnitario),
                  ],
                  [
                    'Margen de contribución',
                    formatCurrency(proyeccion.margen.margenContribucion),
                  ],
                ]
              : []),
          ]}
        />
      </PrintSection>

      <PrintSection title="Escenarios financieros">
        <PrintTable
          headers={[
            'Escenario',
            'Gastos fijos',
            'Ganancia neta',
            'Después de fijos',
            'Punto equilibrio',
          ]}
          rows={proyeccion.escenarios.map((e) => [
            e.titulo,
            formatCurrency(e.gastosFijos),
            formatCurrency(e.gananciaNetaMes),
            formatCurrency(e.utilidadDespuesFijos),
            e.puntoEquilibrioBolis != null
              ? formatNumber(e.puntoEquilibrioBolis)
              : '—',
          ])}
        />
      </PrintSection>

      <PrintSection title="Inventario terminado (con stock)">
        <PrintTable
          headers={[
            'Sabor',
            'Tipo',
            'Producido',
            'Vendido',
            'Disponible',
            'Precio',
          ]}
          rows={conStock.map((i) => [
            i.sabor_nombre,
            i.tipo,
            formatNumber(i.total_producido),
            formatNumber(i.total_vendido),
            formatNumber(i.stock_disponible),
            formatCurrency(i.precio_venta),
          ])}
          emptyMessage="No hay stock disponible registrado"
        />
      </PrintSection>
    </>
  );
}

function sugerenciaRows(items: SugerenciaCompra[]): (string | number)[][] {
  return items.map((s) => [
    s.insumo_nombre,
    URGENCIA_LABEL[s.urgencia],
    formatQty(s.stock_actual, s.unidad),
    formatQty(s.consumo_diario_promedio, `${s.unidad}/día`),
    formatQty(s.consumo_proyectado, s.unidad),
    s.cantidad_sugerida > 0
      ? formatQty(s.cantidad_sugerida, s.unidad)
      : '—',
  ]);
}

function InventarioPrint({ alertas }: { alertas: AlertasYComprasData }) {
  return (
    <>
      <PrintSection title="Próximos a agotarse">
        <PrintTable
          headers={[
            'Insumo',
            'Urgencia',
            'Stock',
            'Consumo/día',
            'Proy. 7 días',
            'Sugerido comprar',
          ]}
          rows={sugerenciaRows(alertas.proximosAgotarse)}
          emptyMessage="No hay alertas críticas"
        />
      </PrintSection>

      <PrintSection title="Sugerencias de compra">
        <PrintTable
          headers={[
            'Insumo',
            'Urgencia',
            'Stock',
            'Consumo/día',
            'Proy. 7 días',
            'Sugerido comprar',
          ]}
          rows={sugerenciaRows(alertas.sugerenciaCompra)}
          emptyMessage="No hay compras sugeridas"
        />
      </PrintSection>

      <PrintSection title="Actividad reciente del sistema">
        <PrintTable
          headers={['Fecha', 'Acción', 'Entidad', 'Detalle']}
          rows={alertas.logsRecientes.map((log) => [
            log.created_at
              ? format(new Date(log.created_at), 'd/MMM HH:mm', { locale: es })
              : '—',
            log.tipo_accion,
            log.entidad,
            log.descripcion,
          ])}
          emptyMessage="Sin registros en el log"
        />
      </PrintSection>
    </>
  );
}

function VentasPrint({ ventas }: { ventas: ReportesData }) {
  const { kpis, ventasDiarias, saboresCantidad, saboresUtilidad, range } =
    ventas;

  return (
    <>
      <p className="print-subtitle print-subtitle--inline">
        Período: {formatRange(range)}
      </p>

      <PrintSection title="Indicadores del período">
        <PrintTable
          headers={['Concepto', 'Valor']}
          rows={[
            ['Ganancia neta', formatCurrency(kpis.gananciaNeta)],
            ['Ingresos', formatCurrency(kpis.ingresosTotales)],
            ['Costos de producción', formatCurrency(kpis.costosProduccion)],
            ['Comisiones', formatCurrency(kpis.comisionesPagadas)],
            ['Bolis vendidos', formatNumber(kpis.totalBolis)],
          ]}
        />
      </PrintSection>

      <PrintSection title="Ventas por día">
        <PrintTable
          headers={['Día', 'Ingreso', 'Ganancia neta', 'Bolis']}
          rows={ventasDiarias.map((d) => [
            d.label,
            formatCurrency(d.ingreso),
            formatCurrency(d.gananciaNeta),
            formatNumber(d.cantidad),
          ])}
          emptyMessage="No hay ventas en este período"
        />
      </PrintSection>

      <PrintSection title="Sabores más vendidos">
        <PrintTable
          headers={['Sabor', 'Cantidad']}
          rows={saboresCantidad.map((s) => [
            s.saborNombre,
            formatNumber(s.cantidad),
          ])}
          emptyMessage="Sin ventas por sabor"
        />
      </PrintSection>

      <PrintSection title="Utilidad por sabor" breakAfter={false}>
        <PrintTable
          headers={['Sabor', 'Cantidad', 'Ganancia neta']}
          rows={saboresUtilidad.map((s) => [
            s.saborNombre,
            formatNumber(s.cantidad),
            formatCurrency(s.gananciaNeta),
          ])}
          emptyMessage="Sin datos de utilidad por sabor"
        />
      </PrintSection>
    </>
  );
}

function shouldShow(
  scope: ReportesPrintScope,
  section: 'finanzas' | 'inventario' | 'ventas',
): boolean {
  return scope === 'all' || scope === section;
}

export function ReportesPrintDocument({
  scope,
  printedAt,
  tablero,
  alertas,
  ventas,
}: ReportesPrintDocumentProps) {
  const showFin = shouldShow(scope, 'finanzas');
  const showInv = shouldShow(scope, 'inventario');
  const showVen = shouldShow(scope, 'ventas');

  const subtitle =
    scope === 'ventas'
      ? `Período: ${formatRange(ventas.range)}`
      : scope === 'all'
        ? 'Finanzas · Inventario · Ventas'
        : undefined;

  return (
    <div
      className="print-document hidden print:block"
      id="reportes-print-document"
      aria-hidden="true"
    >
      <PrintHeader
        title={SCOPE_TITLE[scope]}
        printedAt={printedAt}
        subtitle={subtitle}
      />

      {showFin ? (
        <div className="print-block">
          {scope === 'all' ? (
            <h2 className="print-block-title">Finanzas</h2>
          ) : null}
          <FinanzasPrint tablero={tablero} />
        </div>
      ) : null}

      {showInv ? (
        <div
          className={`print-block${scope === 'all' ? ' print-block--new-page' : ''}`}
        >
          {scope === 'all' ? (
            <h2 className="print-block-title">Inventario</h2>
          ) : null}
          <InventarioPrint alertas={alertas} />
        </div>
      ) : null}

      {showVen ? (
        <div
          className={`print-block${scope === 'all' ? ' print-block--new-page' : ''}`}
        >
          {scope === 'all' ? (
            <h2 className="print-block-title">Ventas</h2>
          ) : null}
          <VentasPrint ventas={ventas} />
        </div>
      ) : null}

      <footer className="print-footer">
        Generado desde la app Bolis — datos al momento de imprimir
      </footer>
    </div>
  );
}
