import { Card } from '@/components/ui/Card';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface RankingItem {
  id: string;
  title: string;
  primary: string;
  secondary?: string;
}

interface RankingListProps {
  title: string;
  emptyMessage: string;
  items: RankingItem[];
}

export function RankingList({ title, emptyMessage, items }: RankingListProps) {
  return (
    <Card variant="elevated">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full bg-brand" aria-hidden />
        <h2 className="text-sm font-bold text-stone-800">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-stone-50/80 px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    index === 0
                      ? 'bg-brand text-white shadow-sm shadow-brand/30'
                      : 'bg-white text-stone-500 ring-1 ring-stone-200'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-800">
                    {item.title}
                  </p>
                  {item.secondary ? (
                    <p className="text-xs text-stone-500">{item.secondary}</p>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-stone-900">
                {item.primary}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function saboresToRankingItems(
  sabores: {
    saborId: string;
    saborNombre: string;
    cantidad: number;
    ingreso: number;
  }[],
) {
  return sabores.map((s) => ({
    id: s.saborId,
    title: s.saborNombre,
    primary: `${formatNumber(s.cantidad)} bolis`,
    secondary: formatCurrency(s.ingreso),
  }));
}

export function vendedorasToRankingItems(
  vendedoras: {
    vendedoraId: string;
    vendedoraNombre: string;
    cantidad: number;
    gananciaNeta: number;
    comision: number;
  }[],
) {
  return vendedoras.map((v) => ({
    id: v.vendedoraId,
    title: v.vendedoraNombre,
    primary: formatCurrency(v.gananciaNeta),
    secondary: `${formatNumber(v.cantidad)} bolis · Comisión ${formatCurrency(v.comision)}`,
  }));
}
