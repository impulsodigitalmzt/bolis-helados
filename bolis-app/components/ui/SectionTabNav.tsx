'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { APP_LOGO_SRC, APP_NAME } from '@/lib/branding';

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
  /** En móvil: reparte N pestañas en columnas iguales (sin scroll horizontal). */
  equalColumns?: boolean;
  /** Sin margen inferior (p. ej. barra fija arriba). */
  pinned?: boolean;
  /** Botones compactos en la franja de hint (p. ej. navegación / actualizar). */
  hintActions?: ReactNode;
  /** Título de sección en sub-barra (tablet/PC), p. ej. «Reportes». */
  sectionTitle?: string;
  /** Fila logo + marca sobre las pestañas (tablet/PC). */
  showBrand?: boolean;
  /** Muestra el texto descriptivo (hint) en la sub-barra. */
  showHintText?: boolean;
}

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
    : `flex min-w-0 flex-col items-center gap-0.5 px-0.5 py-2 text-center transition sm:gap-1 sm:px-1.5 sm:py-3 md:gap-1.5 md:px-2 md:py-3.5 lg:py-4 ${
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
      <span className="text-[11px] leading-tight line-clamp-2">{item.label}</span>
    </>
  ) : (
    <>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg md:h-9 md:w-9 lg:h-10 lg:w-10 ${
          isActive ? 'bg-white/20' : 'border border-stone-400 bg-white'
        }`}
      >
        <Icon
          className={`h-4 w-4 md:h-[1.125rem] md:w-[1.125rem] lg:h-5 lg:w-5 ${isActive ? 'text-white' : 'text-stone-700'}`}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </span>
      <span className="text-[9px] font-bold leading-tight sm:text-[10px] md:text-[11px] lg:text-xs line-clamp-2">
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
  equalColumns = false,
  pinned = false,
  hintActions,
  sectionTitle,
  showBrand = false,
  showHintText = true,
}: SectionTabNavProps) {
  const resolvedActive =
    activeKey ??
    items.find((item) => item.href && isActiveLink(pathname, item.href))?.key ??
    items[0]?.key;

  const current = items.find((item) => item.key === resolvedActive) ?? items[0];
  const isDock = variant === 'dock';
  const scrollableTabs =
    !isDock && !equalColumns && items.length >= 5;
  const cardGridClass = equalColumns
    ? items.length === 5
      ? 'grid-cols-5'
      : items.length === 4
        ? 'grid-cols-4'
        : items.length === 3
          ? 'grid-cols-3'
          : 'grid-cols-2'
    : items.length === 2
      ? 'grid-cols-2'
      : items.length === 3
        ? 'grid-cols-3'
        : items.length === 4
          ? 'grid-cols-2 md:grid-cols-4'
          : 'md:grid-cols-5';

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
      className={`w-full ${pinned ? 'mb-0' : 'mb-6'} !p-0 ${
        isDock
          ? 'w-full overflow-hidden border-b-2 border-stone-500 bg-stone-200 shadow-[0_6px_24px_rgb(0_0_0_/0.18)]'
          : `card-premium ${trailing ? 'overflow-visible' : 'overflow-hidden'} ${
              pinned ? '!rounded-none !border-x-0 !border-t-0 !shadow-none' : ''
            }`
      } ${className}`}
      aria-label={ariaLabel}
    >
      {showBrand ? (
        <div className="hidden items-center gap-2.5 border-b border-stone-300 px-4 py-2.5 md:flex md:px-6 lg:px-8">
          <img
            src={APP_LOGO_SRC}
            alt={APP_NAME}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white/80"
          />
          <span className="badge-brand">Bolis &amp; Más</span>
        </div>
      ) : null}
      <div
        className={
          isDock
            ? 'flex min-h-[4.25rem] items-center gap-0.5 px-1.5 py-1'
            : 'flex items-stretch'
        }
      >
        {isDock ? (
          tabButtons
        ) : scrollableTabs ? (
          <div className="flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain md:overflow-visible">
            <div className="flex min-w-max flex-1 divide-x-2 divide-stone-300 md:grid md:min-w-0 md:grid-cols-5">
              {tabButtons}
            </div>
          </div>
        ) : (
          <div
            className={`grid min-w-0 flex-1 divide-x-2 divide-stone-300 ${cardGridClass}`}
          >
            {tabButtons}
          </div>
        )}
        {trailing}
      </div>
      {hintActions || (showHint && showHintText && current?.hint) ? (
        <div
          className={`flex items-center gap-2 border-t-2 border-stone-300 bg-stone-200 px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-2.5 lg:px-6 ${
            !showHintText || !current?.hint ? 'justify-end' : ''
          }`}
        >
          {showHint && showHintText && current?.hint ? (
            <div className="min-w-0 flex-1">
              {sectionTitle ? (
                <>
                  <p className="text-center text-xs font-medium leading-snug text-stone-800 break-words md:hidden">
                    {current.hint}
                  </p>
                  <div className="hidden min-w-0 md:block">
                    <h1 className="text-lg font-extrabold leading-tight text-stone-900 lg:text-xl">
                      {sectionTitle}
                    </h1>
                    <p className="mt-0.5 text-sm font-medium text-stone-700">
                      {current.hint}
                    </p>
                  </div>
                </>
              ) : (
                <p className="min-w-0 text-center text-xs font-medium leading-snug text-stone-800 break-words md:text-left md:text-sm">
                  {current.hint}
                </p>
              )}
            </div>
          ) : null}
          {hintActions ? (
            <div className="flex shrink-0 items-center gap-1">{hintActions}</div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
