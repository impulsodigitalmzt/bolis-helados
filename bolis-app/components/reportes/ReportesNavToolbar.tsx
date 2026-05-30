'use client';

import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from '@/components/ui/icons';
import { ReportesPrintMenu } from '@/components/reportes/print/ReportesPrintMenu';
import type { ReportesPrintScope } from '@/components/reportes/print/ReportesPrintDocument';

const navBtnClass =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-stone-400 bg-white text-stone-700 transition hover:border-brand hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40';

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
      <button
        type="button"
        disabled={!canGoBack}
        onClick={onBack}
        className={navBtnClass}
        aria-label="Pestaña anterior"
      >
        <IconChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        disabled={!canGoForward}
        onClick={onForward}
        className={navBtnClass}
        aria-label="Pestaña siguiente"
      >
        <IconChevronRight className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        disabled={isRefreshing}
        onClick={onRestore}
        className={navBtnClass}
        aria-label="Restaurar datos"
      >
        <IconRefresh
          className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          aria-hidden
        />
      </button>
      <ReportesPrintMenu activeTab={activeTab} onPrint={onPrint} />
    </>
  );
}
