'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { IconUsers } from '@/components/ui/icons';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  fieldLabelClass,
  fieldSelectClass,
} from '@/components/ui/fieldStyles';
import {
  registrarVenta,
  semaforoStock,
  type SaborPos,
} from '@/lib/queries/ventas';
import { APP_LOGO_SRC, APP_NAME } from '@/lib/branding';
import type { Vendedora } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/format';

interface PosVentaProps {
  sabores: SaborPos[];
  vendedoras: Vendedora[];
}

const posInputClass =
  'mt-1.5 w-full min-w-0 max-w-full rounded-2xl border-2 border-stone-400 bg-white px-2.5 py-2.5 text-sm font-semibold text-stone-950 shadow-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/30 disabled:bg-stone-100';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PosVenta({ sabores, vendedoras }: PosVentaProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fecha, setFecha] = useState(todayISO);
  const [cantidad, setCantidad] = useState('1');
  const [vendedoraId, setVendedoraId] = useState('');
  const [saborSeleccionadoId, setSaborSeleccionadoId] = useState<string | null>(
    null,
  );
  const [vendedoraMenuOpen, setVendedoraMenuOpen] = useState(false);
  const vendedoraMenuRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ultimoSaborId, setUltimoSaborId] = useState<string | null>(null);

  useEffect(() => {
    if (!vendedoraMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (
        vendedoraMenuRef.current &&
        !vendedoraMenuRef.current.contains(e.target as Node)
      ) {
        setVendedoraMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [vendedoraMenuOpen]);

  const cantidadNum = Math.max(1, parseInt(cantidad, 10) || 1);

  const saboresMap = useMemo(
    () => new Map(sabores.map((s) => [s.sabor_id, s])),
    [sabores],
  );

  const vendedoraNombre = useMemo(() => {
    if (!vendedoraId) return 'Mostrador';
    return (
      vendedoras.find((v) => v.id === vendedoraId)?.nombre ?? 'Mostrador'
    );
  }, [vendedoraId, vendedoras]);

  function handleRegistrarVenta() {
    if (!saborSeleccionadoId) {
      setError('Selecciona un sabor en el catálogo.');
      return;
    }
    handleVenta(saborSeleccionadoId);
  }

  function handleVenta(saborId: string) {
    setError(null);
    const sabor = saboresMap.get(saborId);
    if (!sabor) return;

    if (sabor.stock_disponible < cantidadNum) {
      setError(
        `No hay suficiente «${sabor.sabor_nombre}» (disponibles: ${sabor.stock_disponible}).`,
      );
      return;
    }

    startTransition(async () => {
      try {
        await registrarVenta({
          sabor_id: saborId,
          cantidad: cantidadNum,
          fecha,
          vendedora_id: vendedoraId || null,
        });

        setUltimoSaborId(saborId);
        setCantidad('1');
        setSuccessMessage('Venta registrada');
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo registrar la venta',
        );
      }
    });
  }

  return (
    <>
      {successMessage ? (
        <SuccessToast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="card-premium mb-3 min-w-0 shrink-0 space-y-3 overflow-hidden p-3">
          <div
            className="relative flex min-h-[2.75rem] items-center justify-center px-11"
            ref={vendedoraMenuRef}
          >
            <img
              src={APP_LOGO_SRC}
              alt={APP_NAME}
              width={36}
              height={36}
              className="absolute left-0 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full object-cover shadow-sm ring-2 ring-white/80"
            />
            <div className="min-w-0 max-w-full text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                Vendedor
              </p>
              <p className="truncate text-base font-extrabold text-stone-900">
                {vendedoraNombre}
              </p>
            </div>

            {vendedoras.length > 0 ? (
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setVendedoraMenuOpen((o) => !o)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition ${
                    vendedoraId
                      ? 'border-brand bg-orange-50 text-brand-dark'
                      : 'border-stone-400 bg-white text-stone-600'
                  }`}
                  aria-label="Cambiar vendedor"
                >
                  <IconUsers className="h-5 w-5" />
                </button>
                {vendedoraMenuOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-1 w-[min(14rem,calc(100vw-2rem))] rounded-xl border-2 border-stone-300 bg-white p-2 shadow-lg">
                    <select
                      id="pos-vendedora"
                      value={vendedoraId}
                      disabled={isPending}
                      onChange={(e) => {
                        setVendedoraId(e.target.value);
                        setVendedoraMenuOpen(false);
                      }}
                      className={`${fieldSelectClass} mt-0`}
                    >
                      <option value="">Mostrador / sin comisión</option>
                      {vendedoras.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre}
                          {v.comision_por_boli > 0
                            ? ` · ${formatCurrency(v.comision_por_boli)}/boli`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2">
            <div className="min-w-0 overflow-hidden">
              <label htmlFor="pos-fecha" className={fieldLabelClass}>
                Fecha
              </label>
              <input
                id="pos-fecha"
                type="date"
                value={fecha}
                disabled={isPending}
                onChange={(e) => setFecha(e.target.value)}
                className={`${posInputClass} !text-xs sm:!text-sm`}
              />
            </div>
            <div className="min-w-0">
              <label
                htmlFor="pos-cantidad"
                className={`${fieldLabelClass} leading-tight`}
              >
                Cantidad por venta
              </label>
              <input
                id="pos-cantidad"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={cantidad}
                disabled={isPending}
                onChange={(e) => setCantidad(e.target.value)}
                className={`${posInputClass} tabular-nums`}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isPending || !saborSeleccionadoId}
            onClick={handleRegistrarVenta}
            className={`w-full rounded-2xl px-4 py-3.5 text-base font-bold uppercase tracking-wide text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed ${
              isPending || !saborSeleccionadoId
                ? 'bg-stone-400'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {isPending ? 'Registrando…' : 'REGISTRAR VENTA'}
          </button>
        </div>

        {error ? (
          <div className="mb-2 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <p
          className="mb-1 flex w-full max-w-full shrink-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-[10px] leading-snug text-stone-500"
          aria-label="Leyenda de inventario: Alto desde 4, Medio de 1 a 3, Agotado en 0"
        >
          <span className="shrink-0 whitespace-nowrap font-semibold">
            Inventario:
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden />
            Alto (≥4)
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
            <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden />
            Medio (1-3)
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
            <span className="h-2 w-2 shrink-0 rounded-full bg-stone-400" aria-hidden />
            Agotado (0)
          </span>
        </p>

        <p className="mb-2 shrink-0 text-center text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Toca un sabor para vender
        </p>

        <div className="grid min-h-0 flex-1 grid-cols-3 auto-rows-fr gap-2">
          {sabores.map((sabor) => {
            const sinStock = sabor.stock_disponible < cantidadNum;
            const recienVendido = ultimoSaborId === sabor.sabor_id && !isPending;
            const seleccionado = saborSeleccionadoId === sabor.sabor_id;
            const semaforo = semaforoStock(sabor.stock_disponible);

            return (
              <button
                key={sabor.sabor_id}
                type="button"
                disabled={isPending || sinStock}
                onClick={() => {
                  setError(null);
                  setSaborSeleccionadoId(sabor.sabor_id);
                }}
                className={`relative flex h-full min-h-[5rem] flex-col items-center justify-center rounded-2xl border-2 px-1.5 py-2.5 text-center transition active:scale-[0.98] disabled:cursor-not-allowed ${
                  recienVendido
                    ? 'border-profit bg-green-50 shadow-md'
                    : seleccionado
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-400/40'
                      : sinStock
                        ? 'border-stone-200 bg-stone-100 opacity-90'
                        : 'border-stone-200 bg-white shadow-sm hover:border-brand/50 hover:bg-orange-50/40'
                }`}
              >
                <span
                  className={`absolute right-1.5 top-1.5 h-2 w-2 shrink-0 rounded-full ${
                    semaforo === 'verde'
                      ? 'bg-green-500'
                      : semaforo === 'naranja'
                        ? 'bg-orange-500'
                        : 'bg-stone-400'
                  }`}
                  aria-hidden
                />
                <span className="line-clamp-2 px-0.5 text-[11px] font-bold leading-tight text-stone-800">
                  {sabor.sabor_nombre}
                </span>
                <span className="mt-1 text-xs font-bold tabular-nums text-brand">
                  {formatCurrency(sabor.precio_venta)}
                </span>
                <span
                  className={`mt-1.5 text-[10px] font-semibold tabular-nums ${
                    sinStock ? 'text-stone-500' : 'text-stone-600'
                  }`}
                >
                  Stock: {sabor.stock_disponible}
                </span>
              </button>
            );
          })}
        </div>

        {sabores.length === 0 ? (
          <p className="mt-4 text-center text-sm text-stone-500">
            Registra producción en Config → Producción para tener inventario.
          </p>
        ) : null}

        {isPending ? (
          <p className="mt-2 shrink-0 text-center text-xs font-semibold text-brand-dark">
            Registrando venta…
          </p>
        ) : null}
      </div>
    </>
  );
}
