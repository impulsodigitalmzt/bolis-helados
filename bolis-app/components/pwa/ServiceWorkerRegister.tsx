'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Registro opcional; la app funciona sin SW en iOS vía “Agregar a inicio”. */
    });
  }, []);

  return null;
}
