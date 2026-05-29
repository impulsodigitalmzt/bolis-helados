'use client';

import { useEffect } from 'react';

interface SuccessToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function SuccessToast({
  message,
  onDismiss,
  durationMs = 4000,
}: SuccessToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 top-4 z-[70]"
    >
      <div className="app-container">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-3.5 shadow-lg shadow-emerald-100/50">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
          ✓
        </span>
        <p className="flex-1 pt-1 text-sm font-medium text-emerald-900">
          {message}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-1 text-emerald-700 hover:bg-emerald-100"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      </div>
    </div>
  );
}
