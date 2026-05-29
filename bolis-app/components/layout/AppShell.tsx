import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-stone-400/25 to-transparent"
        aria-hidden
      />
      <main className="app-container relative flex-1 pb-28 pt-7">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
