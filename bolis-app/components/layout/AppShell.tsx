'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppPrimaryNav } from './AppPrimaryNav';
import {
  SECTION_CONTENT_OFFSET_COMPACT_CLASS,
  SECTION_FIXED_HEADER_CLASS,
} from '@/lib/sectionChrome';

interface AppShellProps {
  children: ReactNode;
}

function usesSectionChrome(pathname: string): boolean {
  return (
    pathname.startsWith('/reportes') ||
    pathname.startsWith('/configuracion') ||
    pathname === '/dashboard' ||
    pathname === '/venta' ||
    pathname === '/registrar'
  );
}

function usesPrimaryNav(pathname: string): boolean {
  return pathname === '/venta' || pathname === '/registrar';
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const sectionChrome = usesSectionChrome(pathname);
  const primaryNav = usesPrimaryNav(pathname);

  return (
    <div className="relative flex min-h-full flex-col bg-background supports-[height:100dvh]:min-h-[100dvh]">
      {primaryNav ? (
        <div className={SECTION_FIXED_HEADER_CLASS}>
          <AppPrimaryNav />
        </div>
      ) : null}
      <main
        className={
          sectionChrome
            ? `relative flex min-w-0 w-full max-w-none flex-1 flex-col px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0${
                primaryNav ? ` ${SECTION_CONTENT_OFFSET_COMPACT_CLASS}` : ''
              }`
            : 'app-container relative flex min-w-0 flex-1 flex-col pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-7'
        }
      >
        {children}
      </main>
    </div>
  );
}
