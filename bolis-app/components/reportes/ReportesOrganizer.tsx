'use client';

import { useCallback, useState } from 'react';
import { AlertasYCompras } from '@/components/reportes/AlertasYCompras';
import { ReportesDashboard } from '@/components/reportes/ReportesDashboard';
import { TableroFinanciero } from '@/components/reportes/TableroFinanciero';
import {
  ReportesPrintDocument,
  type ReportesPrintScope,
} from '@/components/reportes/print/ReportesPrintDocument';
import { ReportesPrintMenu } from '@/components/reportes/print/ReportesPrintMenu';
import { triggerReportesPrint } from '@/components/reportes/print/triggerReportesPrint';
import { SectionTabNav } from '@/components/ui/SectionTabNav';
import type { AlertasYComprasData } from '@/lib/queries/gestionInteligente';
import type { TableroFinanciero as TableroFinancieroData } from '@/lib/queries/finanzas';
import type { ReportesData } from '@/lib/queries/reportes';
import { IconChart, IconPackage, IconTrending } from '@/components/ui/icons';

type TabId = 'finanzas' | 'inventario' | 'ventas';

const REPORT_TABS = [
  {
    key: 'finanzas' as const,
    label: 'Finanzas',
    hint: 'Utilidad, semáforo y proyección',
    Icon: IconTrending,
  },
  {
    key: 'inventario' as const,
    label: 'Inventario',
    hint: 'Stock, alertas y compras',
    Icon: IconPackage,
  },
  {
    key: 'ventas' as const,
    label: 'Ventas',
    hint: 'KPIs y gráficas por fecha',
    Icon: IconChart,
  },
];

export interface ReportesOrganizerProps {
  tablero: TableroFinancieroData;
  alertas: AlertasYComprasData;
  ventas: ReportesData;
}

export function ReportesOrganizer({
  tablero,
  alertas,
  ventas,
}: ReportesOrganizerProps) {
  const [active, setActive] = useState<TabId>('finanzas');
  const [ventasData, setVentasData] = useState(ventas);
  const [printScope, setPrintScope] = useState<ReportesPrintScope>('all');
  const [printedAt, setPrintedAt] = useState(() => new Date());

  const handlePrint = useCallback((scope: ReportesPrintScope) => {
    setPrintScope(scope);
    setPrintedAt(new Date());
    setTimeout(() => triggerReportesPrint(), 80);
  }, []);

  return (
    <>
      <div className="no-print">
        <div className="sticky top-0 z-50">
          <SectionTabNav
            variant="dock"
            items={[...REPORT_TABS]}
            activeKey={active}
            onActiveChange={(key) => setActive(key as TabId)}
            ariaLabel="Secciones de reportes"
            className="mb-0"
            showHint={false}
            trailing={
              <ReportesPrintMenu activeTab={active} onPrint={handlePrint} />
            }
          />
        </div>

        <div className="card-premium mt-4 rounded-2xl p-4 sm:p-6 lg:p-8">
          {active === 'finanzas' ? (
            <TableroFinanciero data={tablero} embedded />
          ) : null}
          {active === 'inventario' ? (
            <AlertasYCompras initialData={alertas} embedded />
          ) : null}
          {active === 'ventas' ? (
            <ReportesDashboard
              initialData={ventas}
              embedded
              onDataChange={setVentasData}
            />
          ) : null}
        </div>
      </div>

      <ReportesPrintDocument
        scope={printScope}
        printedAt={printedAt}
        tablero={tablero}
        alertas={alertas}
        ventas={ventasData}
      />
    </>
  );
}
