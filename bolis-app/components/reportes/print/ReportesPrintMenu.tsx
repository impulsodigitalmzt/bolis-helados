'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconPrinter } from '@/components/ui/icons';
import type { ReportesPrintScope } from '@/components/reportes/print/ReportesPrintDocument';

type ReportTabId = Exclude<ReportesPrintScope, 'all'>;

const TAB_LABEL: Record<ReportTabId, string> = {
  finanzas: 'finanzas',
  inventario: 'inventario',
  ventas: 'ventas',
};

interface ReportesPrintMenuProps {
  activeTab: ReportTabId;
  onPrint: (scope: ReportesPrintScope) => void;
  disabled?: boolean;
}

export function ReportesPrintMenu({
  activeTab,
  onPrint,
  disabled = false,
}: ReportesPrintMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 192;
    const padding = 8;
    const left = Math.min(
      Math.max(padding, rect.right - menuWidth),
      window.innerWidth - menuWidth - padding,
    );

    setMenuStyle({
      top: rect.bottom + 6,
      left,
      width: menuWidth,
    });
  };

  useEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (scope: ReportesPrintScope) => {
    onPrint(scope);
    setOpen(false);
  };

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: 'fixed',
          top: menuStyle.top,
          left: menuStyle.left,
          width: menuStyle.width,
          zIndex: 9999,
        }}
        className="overflow-hidden rounded-xl border-2 border-stone-400 bg-white py-1 shadow-lg"
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-stone-900 hover:bg-brand-light"
          onClick={() => choose(activeTab)}
        >
          <IconPrinter className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          Imprimir {TAB_LABEL[activeTab]}
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 border-t border-stone-200 px-3 py-2.5 text-left text-sm font-semibold text-stone-900 hover:bg-brand-light"
          onClick={() => choose('all')}
        >
          <IconPrinter className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          Imprimir todo
        </button>
      </div>
    ) : null;

  return (
    <>
      <div className="relative flex shrink-0 items-center pl-0.5">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Opciones de impresión"
          onClick={() => {
            setOpen((prev) => {
              const next = !prev;
              if (next) {
                requestAnimationFrame(updatePosition);
              }
              return next;
            });
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-400 bg-white text-stone-700 shadow-sm transition hover:border-brand hover:text-brand-dark disabled:opacity-50"
        >
          <IconPrinter className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {typeof document !== 'undefined' && menu
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
