'use client';

import {
  IconChevronLeft,
  IconChevronRight,
  IconPrinter,
  IconRefresh,
} from '@/components/ui/icons';
import { bottomToolbarBtnClass } from '@/lib/bottomToolbarStyles';

interface ConfigNavToolbarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isRefreshing?: boolean;
  onBack: () => void;
  onForward: () => void;
  onRestore: () => void;
  onPrint: () => void;
}

export function ConfigNavToolbar({
  canGoBack,
  canGoForward,
  isRefreshing = false,
  onBack,
  onForward,
  onRestore,
  onPrint,
}: ConfigNavToolbarProps) {
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
      <button
        type="button"
        onClick={onPrint}
        className={bottomToolbarBtnClass}
        aria-label="Imprimir"
      >
        <IconPrinter className="h-4 w-4" aria-hidden />
      </button>
    </>
  );
}
