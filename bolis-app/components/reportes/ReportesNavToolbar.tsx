'use client';

import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from '@/components/ui/icons';
import { ReportesPrintMenu } from '@/components/reportes/print/ReportesPrintMenu';
import type { ReportesPrintScope } from '@/components/reportes/print/ReportesPrintDocument';
import { bottomToolbarBtnClass } from '@/lib/bottomToolbarStyles';

interface ReportesNavToolbarProps {
  activeTab: Exclude<ReportesPrintScope, 'all'>;
  canGoBack: boolean;
  canGoForward: boolean;
  isRefreshing?: boolean;
  onBack: () => void;
  onForward: () => void;
  onRestore: () => void;
  onPrint: (scope: ReportesPrintScope) => void;
}

export function ReportesNavToolbar({
  activeTab,
  canGoBack,
  canGoForward,
  isRefreshing = false,
  onBack,
  onForward,
  onRestore,
  onPrint,
}: ReportesNavToolbarProps) {
  return (
    <>
      <div className="flex items-center gap-1 md:hidden">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={onBack}
          className={bottomToolbarBtnClass}
          aria-label="Pestaña anterior"
        >
          <IconChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={!canGoForward}
          onClick={onForward}
          className={bottomToolbarBtnClass}
          aria-label="Pestaña siguiente"
        >
          <IconChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={isRefreshing}
          onClick={onRestore}
          className={bottomToolbarBtnClass}
          aria-label="Restaurar datos"
        >
          <IconRefresh
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden
          />
        </button>
      </div>
      <ReportesPrintMenu activeTab={activeTab} onPrint={onPrint} openAbove />
    </>
  );
}
