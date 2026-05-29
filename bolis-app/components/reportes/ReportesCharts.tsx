'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReportesData } from '@/lib/queries/reportes';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

const BRAND = '#f97316';
const BRAND_DARK = '#ea580c';
const PROFIT = '#059669';

interface ReportesChartsProps {
  data: ReportesData;
}

function ChartTooltipCurrency({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-bold text-stone-600">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

function ChartTooltipCantidad({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-stone-600">{label}</p>
      <p className="text-sm font-bold text-brand">
        {formatNumber(payload[0].value)} bolis
      </p>
    </div>
  );
}

export function ReportesCharts({ data }: ReportesChartsProps) {
  const lineData = data.ventasDiarias.map((d) => ({
    ...d,
    name: d.label,
  }));

  const barData = data.saboresCantidad.map((s) => ({
    name:
      s.saborNombre.length > 12
        ? `${s.saborNombre.slice(0, 11)}…`
        : s.saborNombre,
    fullName: s.saborNombre,
    cantidad: s.cantidad,
  }));

  const utilidadData = data.saboresUtilidad.slice(0, 8).map((s) => ({
    name:
      s.saborNombre.length > 12
        ? `${s.saborNombre.slice(0, 11)}…`
        : s.saborNombre,
    gananciaNeta: s.gananciaNeta,
  }));

  const tickStyle = { fontSize: 11, fill: '#78716c' };

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      <div className="card-premium p-4 sm:p-5 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-brand" aria-hidden />
          <h2 className="text-sm font-bold text-stone-800">
            Tendencia de ventas diarias
          </h2>
        </div>
        {lineData.every((d) => d.ingreso === 0) ? (
          <p className="py-12 text-center text-sm text-stone-500">
            Sin ventas en este periodo
          </p>
        ) : (
          <div className="h-64 w-full min-w-0 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="label"
                  tick={tickStyle}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={tickStyle}
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                  width={48}
                />
                <Tooltip content={<ChartTooltipCurrency />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="ingreso"
                  name="Ingresos"
                  stroke={BRAND}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: BRAND }}
                  activeDot={{ r: 5, fill: BRAND_DARK }}
                />
                <Line
                  type="monotone"
                  dataKey="gananciaNeta"
                  name="Ganancia neta"
                  stroke={PROFIT}
                  strokeWidth={2}
                  dot={{ r: 2, fill: PROFIT }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card-premium p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-brand" aria-hidden />
          <h2 className="text-sm font-bold text-stone-800">
            Cantidad vendida por sabor
          </h2>
        </div>
        {barData.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-500">
            Sin datos de sabores en este periodo
          </p>
        ) : (
          <div className="h-72 w-full min-w-0 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e7e5e4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={tickStyle}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={tickStyle}
                  width={72}
                />
                <Tooltip content={<ChartTooltipCantidad />} />
                <Bar
                  dataKey="cantidad"
                  name="Bolis"
                  fill={BRAND}
                  radius={[0, 8, 8, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card-premium p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-profit" aria-hidden />
          <h2 className="text-sm font-bold text-stone-800">
            Utilidad neta por sabor
          </h2>
        </div>
        {utilidadData.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-500">
            Sin utilidad por sabor en este periodo
          </p>
        ) : (
          <div className="h-72 w-full min-w-0 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={utilidadData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e7e5e4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={tickStyle}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={tickStyle}
                  width={72}
                />
                <Tooltip content={<ChartTooltipCurrency />} />
                <Bar
                  dataKey="gananciaNeta"
                  name="Utilidad neta"
                  fill={PROFIT}
                  radius={[0, 8, 8, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
