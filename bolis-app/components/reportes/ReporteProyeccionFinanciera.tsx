'use client';

import type { ProyeccionFinanciera } from '@/lib/queries/finanzas';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface ReporteProyeccionFinancieraProps {
  proyeccion: ProyeccionFinanciera;
}

export function ReporteProyeccionFinanciera({
  proyeccion,
}: ReporteProyeccionFinancieraProps) {
  const { margen, escenarios } = proyeccion;

  return (
    <section className="min-w-0 max-w-full space-y-4">
      <div>
        <h2 className="text-base font-bold text-stone-900">
          Reporte financiero proyectado
        </h2>
        <p className="text-xs text-stone-500">
          Punto de equilibrio = Gastos fijos ÷ (Precio promedio − Costo variable
          unitario)
        </p>
      </div>

      {margen ? (
        <div className="card-premium grid min-w-0 grid-cols-2 gap-3 p-3 text-[11px] sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <span className="text-stone-500">Precio venta prom.</span>
            <p className="font-bold tabular-nums text-stone-900">
              {formatCurrency(margen.precioPromedio)}
            </p>
          </div>
          <div>
            <span className="text-stone-500">Costo variable unit.</span>
            <p className="font-bold tabular-nums text-cost">
              {formatCurrency(margen.costoVariableUnitario)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-stone-500">Margen contribución</span>
            <p className="font-bold tabular-nums text-profit">
              {formatCurrency(margen.margenContribucion)}
            </p>
          </div>
        </div>
      ) : (
        <p className="card-premium p-4 text-sm text-stone-500">
          Sin ventas este mes: no se puede calcular el punto de equilibrio.
        </p>
      )}

      <div className="card-premium min-w-0 max-w-full overflow-hidden p-0">
        <div className="-mx-px max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[36rem] border-collapse text-sm lg:min-w-0">
            <thead>
              <tr className="bg-stone-100 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                <th className="border border-stone-200 px-2 py-2 text-left">
                  Concepto
                </th>
                {escenarios.map((e) => (
                  <th
                    key={e.id}
                    className="border border-stone-200 px-2 py-2 text-right"
                  >
                    {e.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Fila
                label="Modalidad"
                valores={escenarios.map((e) => e.modalidadLabel)}
                texto
              />
              <Fila
                label="Gastos fijos (mes)"
                valores={escenarios.map((e) => formatCurrency(e.gastosFijos))}
              />
              <Fila
                label="Ingresos (mes)"
                valores={escenarios.map((e) => formatCurrency(e.ingresosMes))}
              />
              <Fila
                label="Costos producción (mes)"
                valores={escenarios.map((e) =>
                  formatCurrency(e.costosProduccionMes),
                )}
              />
              <Fila
                label="Utilidad bruta (mes)"
                valores={escenarios.map((e) =>
                  formatCurrency(e.utilidadBrutaMes),
                )}
                destacar
              />
              <Fila
                label="Comisiones (mes)"
                valores={escenarios.map((e) => formatCurrency(e.comisionesMes))}
              />
              <Fila
                label="Ganancia neta (mes)"
                valores={escenarios.map((e) =>
                  formatCurrency(e.gananciaNetaMes),
                )}
                destacar
              />
              <Fila
                label="Utilidad después de gastos fijos"
                valores={escenarios.map((e) =>
                  formatCurrency(e.utilidadDespuesFijos),
                )}
                destacar
              />
              <Fila
                label="Bolis vendidos (mes)"
                valores={escenarios.map((e) =>
                  formatNumber(e.bolisVendidosMes),
                )}
              />
              <Fila
                label="Punto de equilibrio (bolis/mes)"
                valores={escenarios.map((e) =>
                  e.puntoEquilibrioBolis != null
                    ? formatNumber(e.puntoEquilibrioBolis)
                    : '—',
                )}
                destacar
              />
              <Fila
                label="Bolis extra vs. ventas actuales"
                valores={escenarios.map((e) =>
                  e.bolisExtraNecesarios != null
                    ? formatNumber(e.bolisExtraNecesarios)
                    : '—',
                )}
                alerta={escenarios.some(
                  (e) => e.id === 'local' && (e.bolisExtraNecesarios ?? 0) > 0,
                )}
              />
            </tbody>
          </table>
        </div>
      </div>

      {escenarios.find((e) => e.id === 'local')?.bolisExtraNecesarios ? (
        <p className="break-words rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          En el escenario local necesitarías vender{' '}
          <strong>
            {formatNumber(
              escenarios.find((e) => e.id === 'local')!.bolisExtraNecesarios!,
            )}{' '}
            bolis más
          </strong>{' '}
          al mes (respecto a lo que vendes hoy) solo para cubrir renta y
          servicios.
        </p>
      ) : null}
    </section>
  );
}

function Fila({
  label,
  valores,
  texto,
  destacar,
  alerta,
}: {
  label: string;
  valores: string[];
  texto?: boolean;
  destacar?: boolean;
  alerta?: boolean;
}) {
  return (
    <tr className={destacar ? 'bg-stone-50/80' : 'bg-white'}>
      <td className="border border-stone-200 px-2 py-2 text-xs font-semibold text-stone-700">
        {label}
      </td>
      {valores.map((v, i) => (
        <td
          key={i}
          className={`border border-stone-200 px-2 py-2 text-right text-xs tabular-nums ${
            alerta && i === 1 ? 'font-bold text-amber-800' : 'font-medium text-stone-900'
          } ${texto ? 'font-normal' : ''}`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}
