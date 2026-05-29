'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { IconIceCream, IconStar, IconTrending } from '@/components/ui/icons';
import { ReporteProyeccionFinanciera } from '@/components/reportes/ReporteProyeccionFinanciera';
import { SemaforoFinancieroCard } from '@/components/reportes/SemaforoFinanciero';
import type { TableroFinanciero as TableroData } from '@/lib/queries/finanzas';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface TableroFinancieroProps {
  data: TableroData;
  /** Oculta el encabezado de sección (p. ej. dentro de pestañas). */
  embedded?: boolean;
}

function UtilidadCard({
  titulo,
  utilidad,
  subtitulo,
}: {
  titulo: string;
  utilidad: TableroData['utilidadHoy'];
  subtitulo: string;
}) {
  return (
    <Card variant="brand" className="!p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-dark">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-profit sm:text-3xl">
        {formatCurrency(utilidad.gananciaNeta)}
      </p>
      <p className="mt-1 text-[11px] text-stone-600">{subtitulo}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-stone-500">Utilidad bruta</span>
          <p className="font-bold tabular-nums text-stone-800">
            {formatCurrency(utilidad.utilidadBruta)}
          </p>
        </div>
        <div>
          <span className="text-stone-500">Ingresos</span>
          <p className="font-bold tabular-nums text-stone-800">
            {formatCurrency(utilidad.ingresos)}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function TableroFinanciero({ data, embedded = false }: TableroFinancieroProps) {
  const {
    utilidadHoy,
    utilidadMes,
    productoEstrella,
    inventario,
    proyeccion,
  } = data;
  const conStock = inventario.filter((i) => i.stock_disponible > 0);

  return (
    <section className="space-y-5 lg:space-y-6">
      {embedded ? (
        <div className="flex justify-end">
          <Link
            href="/configuracion/negocio"
            className="text-xs font-bold text-brand hover:text-brand-dark"
          >
            Configurar negocio →
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <IconTrending className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Tablero financiero
              </h2>
              <p className="text-xs font-medium text-stone-700">
                Utilidad real + modalidad de negocio
              </p>
            </div>
          </div>
          <Link
            href="/configuracion/negocio"
            className="shrink-0 text-xs font-bold text-brand"
          >
            Configurar
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="space-y-5 lg:space-y-6">
          <SemaforoFinancieroCard
            proyeccion={proyeccion}
            utilidadMes={utilidadMes}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <UtilidadCard
              titulo="Dinero libre hoy"
              utilidad={utilidadHoy}
              subtitulo={`${formatNumber(utilidadHoy.bolisVendidos)} bolis · antes de gastos fijos`}
            />
            <UtilidadCard
              titulo="Dinero libre del mes"
              utilidad={utilidadMes}
              subtitulo={`${formatNumber(utilidadMes.bolisVendidos)} bolis · utilidad operativa: ${formatCurrency(proyeccion.utilidadDespuesFijos)}`}
            />
          </div>

          <ReporteProyeccionFinanciera proyeccion={proyeccion} />
        </div>

        <div className="space-y-5 lg:space-y-6">
      {productoEstrella ? (
        <Card className="!p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <IconStar className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                Producto estrella (mayor utilidad neta)
              </p>
              <p className="mt-1 text-lg font-extrabold text-stone-900">
                {productoEstrella.sabor_nombre}
              </p>
              <p className="mt-1 text-sm tabular-nums text-profit">
                {formatCurrency(productoEstrella.ganancia_neta)} de utilidad
              </p>
              <p className="text-xs text-stone-500">
                {formatNumber(productoEstrella.cantidad)} vendidos ·{' '}
                {formatCurrency(productoEstrella.ingreso)} ingresos
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden !p-0">
        <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3">
          <IconIceCream className="h-5 w-5 text-brand" />
          <div>
            <p className="text-sm font-bold text-stone-800">
              Inventario producto terminado
            </p>
            <p className="text-[11px] text-stone-500">
              Producción − ventas por sabor
            </p>
          </div>
        </div>

        {inventario.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Sin sabores configurados.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {inventario.map((item) => (
              <li
                key={item.sabor_id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                  item.stock_disponible <= 0 ? 'bg-stone-50/80' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">
                    {item.sabor_nombre}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Prod. {formatNumber(item.total_producido)} · Vend.{' '}
                    {formatNumber(item.total_vendido)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${
                    item.stock_disponible > 0
                      ? 'bg-brand text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {formatNumber(item.stock_disponible)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {conStock.length === 0 && inventario.length > 0 ? (
          <p className="border-t border-stone-100 px-4 py-2 text-center text-xs text-amber-800">
            Sin stock. Registra producción antes de vender.
          </p>
        ) : null}
      </Card>
        </div>
      </div>
    </section>
  );
}
