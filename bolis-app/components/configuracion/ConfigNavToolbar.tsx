'use client';

import {
  IconChevronLeft,
  IconChevronRight,
  IconPrinter,
  IconRefresh,
} from '@/components/ui/icons';

const navBtnClass =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-stone-400 bg-white text-stone-700 transition hover:border-brand hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40';

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
      <button
        type="button"
        onClick={onPrint}
        className={navBtnClass}
        aria-label="Imprimir"
      >
        <IconPrinter className="h-4 w-4" aria-hidden />
      </button>
    </>
  );
}
