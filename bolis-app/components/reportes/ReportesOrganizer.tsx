'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertasYCompras } from '@/components/reportes/AlertasYCompras';
import { ReportesDashboard } from '@/components/reportes/ReportesDashboard';
import { ReportesNavToolbar } from '@/components/reportes/ReportesNavToolbar';
import { TableroFinanciero } from '@/components/reportes/TableroFinanciero';
import {
  ReportesPrintDocument,
  type ReportesPrintScope,
} from '@/components/reportes/print/ReportesPrintDocument';
import { triggerReportesPrint } from '@/components/reportes/print/triggerReportesPrint';
import { SectionTabNav } from '@/components/ui/SectionTabNav';
import type { AlertasYComprasData } from '@/lib/queries/gestionInteligente';
import type { TableroFinanciero as TableroFinancieroData } from '@/lib/queries/finanzas';
import type { ReportesData } from '@/lib/queries/reportes';
import {
  SECTION_FIXED_HEADER_CLASS,
} from '@/lib/sectionChrome';
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

const TAB_ORDER: TabId[] = ['finanzas', 'inventario', 'ventas'];

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
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [active, setActive] = useState<TabId>('finanzas');
  const [ventasData, setVentasData] = useState(ventas);
  const [printScope, setPrintScope] = useState<ReportesPrintScope>('all');
  const [printedAt, setPrintedAt] = useState(() => new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const activeIndex = TAB_ORDER.indexOf(active);
  const canGoBack = activeIndex > 0;
  const canGoForward = activeIndex < TAB_ORDER.length - 1;

  const handlePrint = useCallback((scope: ReportesPrintScope) => {
    setPrintScope(scope);
    setPrintedAt(new Date());
    // Esperar al re-render con el scope correcto antes de abrir impresión
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        triggerReportesPrint();
      });
    });
  }, []);

  const handleRestore = useCallback(() => {
    startRefresh(() => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    });
  }, [router]);

  return (
    <>
      <div className="no-print">
        <div className={SECTION_FIXED_HEADER_CLASS}>
          <SectionTabNav
            items={[...REPORT_TABS]}
            activeKey={active}
            onActiveChange={(key) => setActive(key as TabId)}
            ariaLabel="Secciones de reportes"
            pinned
            showHint
            showBrand
            sectionTitle="Reportes"
            hintActions={
              <ReportesNavToolbar
                activeTab={active}
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                isRefreshing={isRefreshing}
                onBack={() => {
                  if (canGoBack) setActive(TAB_ORDER[activeIndex - 1]);
                }}
                onForward={() => {
                  if (canGoForward) setActive(TAB_ORDER[activeIndex + 1]);
                }}
                onRestore={handleRestore}
                onPrint={handlePrint}
              />
            }
          />
        </div>

        <div className="app-container px-4 sm:px-5 lg:px-8">
          <div
            className={`card-premium mt-3 min-w-0 max-w-full overflow-x-hidden rounded-2xl p-4 sm:mt-4 sm:p-6 lg:p-8 ${
              isRefreshing ? 'opacity-70' : ''
            }`}
          >
            {active === 'finanzas' ? (
              <TableroFinanciero
                key={`finanzas-${refreshKey}`}
                data={tablero}
                embedded
              />
            ) : null}
            {active === 'inventario' ? (
              <AlertasYCompras
                key={`inventario-${refreshKey}`}
                initialData={alertas}
                embedded
              />
            ) : null}
            {active === 'ventas' ? (
              <ReportesDashboard
                key={`ventas-${refreshKey}`}
                initialData={ventas}
                embedded
                onDataChange={setVentasData}
              />
            ) : null}
          </div>
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
