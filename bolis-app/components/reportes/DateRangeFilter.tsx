'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from '@/lib/queries/reportes';
import { fieldInputClass, fieldLabelClass } from '@/components/ui/fieldStyles';

const presets = [
  { id: '7d' as const, label: '7 días' },
  { id: 'mes' as const, label: 'Este mes' },
  { id: '30d' as const, label: '30 días' },
  { id: 'todo' as const, label: 'Todo' },
];

interface DateRangeFilterProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
  onPreset: (preset: '7d' | '30d' | 'mes' | 'todo') => void;
  disabled?: boolean;
}

export function DateRangeFilter({
  range,
  onChange,
  onPreset,
  disabled,
}: DateRangeFilterProps) {
  const rangeLabel =
    range.from && range.to
      ? `${format(parseISO(range.from), 'd MMM yyyy', { locale: es })} – ${format(parseISO(range.to), 'd MMM yyyy', { locale: es })}`
      : '';

  return (
    <div className="card-premium min-w-0 max-w-full space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-stone-800">Rango de fechas</p>
        {rangeLabel ? (
          <p className="text-xs font-semibold text-brand-dark">{rangeLabel}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onPreset(p.id)}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-brand hover:text-white disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="fecha-desde" className={fieldLabelClass}>
            Desde
          </label>
          <input
            id="fecha-desde"
            type="date"
            disabled={disabled}
            value={range.from}
            max={range.to}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
            className={fieldInputClass}
          />
        </div>
        <div>
          <label htmlFor="fecha-hasta" className={fieldLabelClass}>
            Hasta
          </label>
          <input
            id="fecha-hasta"
            type="date"
            disabled={disabled}
            value={range.to}
            min={range.from}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
            className={fieldInputClass}
          />
        </div>
      </div>
    </div>
  );
}
