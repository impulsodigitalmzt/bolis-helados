'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { DateRangeFilter } from '@/components/reportes/DateRangeFilter';
import { ReportesCharts } from '@/components/reportes/ReportesCharts';
import {
  getPresetRange,
  getReportesData,
  type DateRange,
  type ReportesData,
} from '@/lib/queries/reportes';

interface ReportesDashboardProps {
  initialData: ReportesData;
  embedded?: boolean;
  /** Sincroniza datos actualizados (p. ej. para impresión). */
  onDataChange?: (data: ReportesData) => void;
}

export function ReportesDashboard({
  initialData,
  embedded = false,
  onDataChange,
}: ReportesDashboardProps) {
  const [data, setData] = useState(initialData);
  const [range, setRange] = useState<DateRange>(initialData.range);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadRange = useCallback((newRange: DateRange) => {
    if (newRange.from > newRange.to) {
      setError('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    setError(null);
    setRange(newRange);

    startTransition(async () => {
      try {
        const result = await getReportesData(newRange);
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los reportes',
        );
      }
    });
  }, []);

  useEffect(() => {
    onDataChange?.(data);
  }, [data, onDataChange]);

  return (
    <div
      className={`space-y-5 ${isPending ? 'opacity-70' : ''}`}
      role={embedded ? undefined : 'region'}
      aria-label={embedded ? undefined : 'Análisis de ventas por período'}
    >
      {embedded ? (
        <p className="text-xs font-medium text-stone-700">
          Elige el rango de fechas para ver ingresos, costos y gráficas.
        </p>
      ) : null}

      <DateRangeFilter
        range={range}
        disabled={isPending}
        onChange={loadRange}
        onPreset={(preset) => loadRange(getPresetRange(preset))}
      />

      {error ? (
        <div className="alert-warning">{error}</div>
      ) : null}

      {isPending ? (
        <p className="text-center text-xs font-semibold text-brand-dark">
          Actualizando reportes…
        </p>
      ) : null}

      <KpiGrid kpis={data.kpis} />
      <ReportesCharts data={data} />
    </div>
  );
}
