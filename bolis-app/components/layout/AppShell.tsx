'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';

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

  return (
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
      <BottomNav />
    </div>
  );
}
