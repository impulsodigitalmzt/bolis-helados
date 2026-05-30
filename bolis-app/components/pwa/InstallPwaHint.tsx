'use client';

import { useEffect, useState } from 'react';

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

const STORAGE_KEY = 'bolis-pwa-hint-dismissed';

export function InstallPwaHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (window.localStorage.getItem(STORAGE_KEY) === '1') return;

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.matchMedia('(max-width: 768px)').matches;

    if (isMobile) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-[4.75rem] z-[60] px-3 safe-area-pb sm:hidden">
      <div className="mx-auto flex max-w-lg items-start gap-2 rounded-2xl border-2 border-brand/40 bg-white px-3 py-2.5 shadow-lg">
        <p className="min-w-0 flex-1 text-xs leading-snug text-stone-800">
          <span className="font-bold text-brand-dark">Usar como app:</span> en
          Safari → Compartir →{' '}
          <span className="font-semibold">Agregar a inicio</span>. Así desaparece
          la barra del navegador.
        </p>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, '1');
            setVisible(false);
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-stone-500 hover:bg-stone-100"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
}
