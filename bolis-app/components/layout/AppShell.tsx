'use client';

import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BottomToolbarProvider } from '@/components/layout/bottomToolbar';
import { IconChart, IconGear, IconPlus } from '@/components/ui/icons';

const navItems = [
  { href: '/venta', label: 'Venta', Icon: IconPlus },
  { href: '/reportes', label: 'Reportes', Icon: IconChart },
  { href: '/configuracion/productos', label: 'Config', Icon: IconGear },
] as const;

interface AppShellProps {
  children: ReactNode;
}

function usesSectionChrome(pathname: string): boolean {
  return (
    pathname.startsWith('/reportes') ||
    pathname.startsWith('/configuracion') ||
    pathname === '/dashboard'
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const sectionChrome = usesSectionChrome(pathname);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  const toolbarSlotRef = useCallback((node: HTMLDivElement | null) => {
    setToolbarSlot(node);
  }, []);

  return (
    <BottomToolbarProvider slot={toolbarSlot}>
      <div className="relative flex min-h-full flex-col bg-background supports-[height:100dvh]:min-h-[100dvh]">
        {!sectionChrome ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-stone-400/25 to-transparent"
            aria-hidden
          />
        ) : null}
        <main
          className={
            sectionChrome
              ? 'relative flex min-w-0 w-full max-w-none flex-1 flex-col px-0 pb-28 pt-0'
              : 'app-container relative flex min-w-0 flex-1 flex-col pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-7'
          }
        >
          {children}
        </main>
        <BottomNav toolbarSlotRef={toolbarSlotRef} />
      </div>
    </BottomToolbarProvider>
  );
}

function BottomNav({
  toolbarSlotRef,
}: {
  toolbarSlotRef: (node: HTMLDivElement | null) => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-50 border-t-2 border-stone-500 bg-stone-200 shadow-[0_-6px_24px_rgb(0_0_0_/0.18)] safe-area-pb">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center gap-1 px-2 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              item.href === '/configuracion/productos'
                ? pathname.startsWith('/configuracion')
                : item.href === '/reportes'
                  ? pathname === '/reportes' || pathname === '/dashboard'
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`) ||
                    pathname === '/registrar';

            const { Icon } = item;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] transition-all ${
                  isActive
                    ? 'font-semibold text-brand-dark'
                    : 'font-semibold text-stone-800 hover:text-stone-950'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    isActive
                      ? 'bg-brand text-white shadow-md shadow-black/25'
                      : 'border border-stone-400 bg-white text-stone-700'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div
          ref={toolbarSlotRef}
          className="flex shrink-0 items-center gap-1 border-l-2 border-stone-400 pl-2 empty:hidden"
        />
      </div>
    </nav>
  );
}
