'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const BottomToolbarSlotContext = createContext<HTMLElement | null>(null);

export function BottomToolbarProvider({
  slot,
  children,
}: {
  slot: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <BottomToolbarSlotContext.Provider value={slot}>
      {children}
    </BottomToolbarSlotContext.Provider>
  );
}

export function BottomToolbarPortal({ children }: { children: ReactNode }) {
  const slot = useContext(BottomToolbarSlotContext);
  if (!slot) return null;
  return createPortal(children, slot);
}
