'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode, SVGProps } from 'react';

export type SectionTabIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface SectionTabItem {
  key: string;
  label: string;
  hint: string;
  Icon: SectionTabIcon;
  href?: string;
}

interface SectionTabNavProps {
  items: SectionTabItem[];
  ariaLabel: string;
  /** Pestaña activa (modo botones). */
  activeKey?: string;
  onActiveChange?: (key: string) => void;
  /** Ruta actual (modo enlaces). */
  pathname?: string;
  className?: string;
  /** Acción compacta a la derecha (p. ej. menú de impresión). */
  trailing?: ReactNode;
  /** Muestra la franja con el hint de la pestaña activa. */
  showHint?: boolean;
  /** `dock`: barra tipo BottomNav; `card`: tarjeta con bordes redondeados. */
  variant?: 'card' | 'dock';
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

function isActiveLink(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabButton({
  item,
  isActive,
  onSelect,
  variant,
}: {
  item: SectionTabItem;
  isActive: boolean;
  onSelect?: () => void;
  variant: 'card' | 'dock';
}) {
  const { Icon } = item;
  const isDock = variant === 'dock';

  const tabClass = isDock
    ? `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-center transition ${
        isActive
          ? 'font-semibold text-brand-dark'
          : 'font-semibold text-stone-800 hover:text-stone-950'
      }`
    : `flex flex-col items-center gap-1 px-1.5 py-3 text-center transition sm:px-2 sm:py-3.5 ${
        isActive
          ? 'bg-brand text-white'
          : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
      }`;

  const inner = isDock ? (
    <>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          isActive
            ? 'bg-brand text-white shadow-md shadow-black/25'
            : 'border border-stone-400 bg-white text-stone-700'
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
      </span>
      <span className="text-[11px] leading-tight">{item.label}</span>
    </>
  ) : (
    <>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          isActive ? 'bg-white/20' : 'border border-stone-400 bg-white'
        }`}
      >
        <Icon
          className={`h-4 w-4 ${isActive ? 'text-white' : 'text-stone-700'}`}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </span>
      <span className="text-[10px] font-bold leading-tight sm:text-[11px]">
        {item.label}
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={tabClass}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      className={tabClass}
    >
      {inner}
    </button>
  );
}

export function SectionTabNav({
  items,
  ariaLabel,
  activeKey,
  onActiveChange,
  pathname = '',
  className = '',
  trailing,
  showHint = true,
  variant = 'card',
}: SectionTabNavProps) {
  const resolvedActive =
    activeKey ??
    items.find((item) => item.href && isActiveLink(pathname, item.href))?.key ??
    items[0]?.key;

  const current = items.find((item) => item.key === resolvedActive) ?? items[0];
  const gridCols = GRID_COLS[items.length] ?? 'grid-cols-2';
  const isDock = variant === 'dock';

  const tabButtons = items.map((item) => {
    const isActive =
      item.key === resolvedActive ||
      (item.href != null && isActiveLink(pathname, item.href));

    return (
      <TabButton
        key={item.key}
        item={item}
        isActive={isActive}
        variant={variant}
        onSelect={
          onActiveChange ? () => onActiveChange(item.key) : undefined
        }
      />
    );
  });

  return (
    <nav
      className={`mb-6 !p-0 ${
        isDock
          ? 'w-full overflow-hidden border-b-2 border-stone-500 bg-stone-200 shadow-[0_6px_24px_rgb(0_0_0_/0.18)]'
          : `card-premium ${trailing ? 'overflow-visible' : 'overflow-hidden'}`
      } ${className}`}
      aria-label={ariaLabel}
    >
      <div
        className={
          isDock
            ? 'flex h-[4.25rem] items-center gap-0.5 px-1.5'
            : 'flex items-stretch'
        }
      >
        {isDock ? (
          tabButtons
        ) : (
          <div
            className={`grid min-w-0 flex-1 ${gridCols} divide-x-2 divide-stone-300`}
          >
            {tabButtons}
          </div>
        )}
        {trailing}
      </div>
      {showHint && current?.hint ? (
        <p className="border-t-2 border-stone-300 bg-stone-200 px-3 py-2.5 text-center text-xs font-medium text-stone-800">
          {current.hint}
        </p>
      ) : null}
    </nav>
  );
}
