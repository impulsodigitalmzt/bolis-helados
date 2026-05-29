/** Espera al siguiente frame y abre el diálogo de impresión del navegador. */
export function triggerReportesPrint(): void {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    window.print();
  });
}
