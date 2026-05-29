import { Card } from '@/components/ui/Card';
import {
  IconDollar,
  IconIceCream,
  IconPackage,
  IconTrending,
  IconUsers,
} from '@/components/ui/icons';
import type { DashboardKpis } from '@/lib/queries/dashboard';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface KpiGridProps {
  kpis: DashboardKpis;
}

const secondaryKpis = [
  {
    key: 'ingresosTotales' as const,
    label: 'Ingresos',
    Icon: IconDollar,
    iconClass: 'bg-brand text-white',
    valueClass: 'text-stone-900',
  },
  {
    key: 'costosProduccion' as const,
    label: 'Costos',
    Icon: IconPackage,
    iconClass: 'bg-cost text-white',
    valueClass: 'text-cost',
  },
  {
    key: 'comisionesPagadas' as const,
    label: 'Comisiones',
    Icon: IconUsers,
    iconClass: 'bg-stone-700 text-white',
    valueClass: 'text-stone-800',
  },
];

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <Card variant="brand" className="!p-5 md:col-span-2 lg:col-span-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-dark">
              Ganancia neta real
            </p>
            <p className="mt-2 text-3xl font-extrabold leading-none tracking-tight tabular-nums text-profit sm:text-4xl">
              {formatCurrency(kpis.gananciaNeta)}
            </p>
            <p className="mt-2 text-xs font-medium text-stone-600">
              Después de costos y comisiones
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/30">
            <IconTrending className="h-6 w-6" />
          </span>
        </div>
      </Card>

      {secondaryKpis.map((item) => (
          <Card key={item.key} className="!p-3 lg:!p-4">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${item.iconClass}`}
            >
              <item.Icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              {item.label}
            </p>
            <p
              className={`mt-0.5 text-sm font-bold leading-tight tabular-nums ${item.valueClass}`}
            >
              {formatCurrency(kpis[item.key])}
            </p>
          </Card>
        ))}

      <Card className="flex items-center justify-between !py-3.5 md:col-span-2 lg:col-span-1">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            <IconIceCream className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Bolis vendidos
            </p>
            <p className="text-xl font-extrabold tabular-nums text-stone-900">
              {formatNumber(kpis.totalBolis)}
            </p>
          </div>
        </div>
        <span className="badge-brand">periodo</span>
      </Card>
    </div>
  );
}
