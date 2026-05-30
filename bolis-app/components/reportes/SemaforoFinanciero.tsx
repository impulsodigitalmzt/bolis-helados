'use client';

import type {
  ProyeccionFinanciera,
  UtilidadPeriodo,
} from '@/lib/queries/finanzas';
import type { SemaforoFinanciero as Estado } from '@/lib/utils/proyeccionFinanciera';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

const ESTADOS: Record<
  Estado,
  { titulo: string; mensaje: string; bg: string; ring: string; dot: string }
> = {
  verde: {
    titulo: 'Verde — Negocio rentable',
    mensaje:
      'Cubres costos de producción, comisiones y gastos fijos. Generas utilidad operativa.',
    bg: 'bg-green-50',
    ring: 'ring-green-200',
    dot: 'bg-green-500',
  },
  amarillo: {
    titulo: 'Amarillo — Cubres producción',
    mensaje:
      'Vendes con margen sobre insumos, pero aún no alcanzas a pagar todos tus gastos fijos del mes.',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    dot: 'bg-amber-500',
  },
  rojo: {
    titulo: 'Rojo — Pérdida operativa',
    mensaje:
      'Tus ventas del mes no cubren costos de producción y comisiones. Estás perdiendo dinero al operar.',
    bg: 'bg-red-50',
    ring: 'ring-red-200',
    dot: 'bg-red-600',
  },
};

interface SemaforoFinancieroProps {
  proyeccion: ProyeccionFinanciera;
  utilidadMes: UtilidadPeriodo;
}

export function SemaforoFinancieroCard({
  proyeccion,
  utilidadMes,
}: SemaforoFinancieroProps) {
  const estado = ESTADOS[proyeccion.semaforo];

  return (
    <div
      className={`min-w-0 max-w-full overflow-hidden rounded-2xl p-4 ring-2 ${estado.bg} ${estado.ring}`}
      role="status"
      aria-label={estado.titulo}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex flex-col gap-1.5 pt-1">
          <span
            className={`h-4 w-4 rounded-full ${ESTADOS.verde.dot} ${
              proyeccion.semaforo !== 'verde' ? 'opacity-25' : ''
            }`}
          />
          <span
            className={`h-4 w-4 rounded-full ${ESTADOS.amarillo.dot} ${
              proyeccion.semaforo !== 'amarillo' ? 'opacity-25' : ''
            }`}
          />
          <span
            className={`h-4 w-4 rounded-full ${ESTADOS.rojo.dot} ${
              proyeccion.semaforo !== 'rojo' ? 'opacity-25' : ''
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-extrabold text-stone-900">
            {estado.titulo}
          </p>
          <p className="mt-1 break-words text-xs leading-relaxed text-stone-700">
            {estado.mensaje}
          </p>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-stone-500">Ganancia neta mes</span>
              <p className="font-bold tabular-nums text-stone-900">
                {formatCurrency(utilidadMes.gananciaNeta)}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Gastos fijos mes</span>
              <p className="font-bold tabular-nums text-stone-900">
                {formatCurrency(proyeccion.gastosFijosMes)}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-stone-500">Utilidad después de gastos fijos</span>
              <p
                className={`text-base font-extrabold tabular-nums ${
                  proyeccion.utilidadDespuesFijos >= 0
                    ? 'text-profit'
                    : 'text-cost'
                }`}
              >
                {formatCurrency(proyeccion.utilidadDespuesFijos)}
              </p>
            </div>
          </div>
          {proyeccion.puntoEquilibrioBolis != null ? (
            <p className="mt-2 text-[11px] text-stone-600">
              Punto de equilibrio:{' '}
              <span className="font-bold tabular-nums text-stone-900">
                {formatNumber(proyeccion.puntoEquilibrioBolis)} bolis/mes
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
