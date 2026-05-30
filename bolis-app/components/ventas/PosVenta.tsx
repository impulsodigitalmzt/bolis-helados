'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { IconUsers } from '@/components/ui/icons';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  fieldInputClass,
  fieldLabelClass,
  fieldSelectClass,
} from '@/components/ui/fieldStyles';
import {
  registrarVenta,
  semaforoStock,
  type SaborPos,
} from '@/lib/queries/ventas';
import type { Vendedora } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/format';

interface PosVentaProps {
  sabores: SaborPos[];
  vendedoras: Vendedora[];
}

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

      <div className="card-premium mb-4 space-y-3 p-3 sm:p-4">
        <div
          className="relative flex min-h-[2.75rem] items-center justify-center px-12"
          ref={vendedoraMenuRef}
        >
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

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label htmlFor="pos-fecha" className={fieldLabelClass}>
              Fecha
            </label>
            <input
              id="pos-fecha"
              type="date"
              value={fecha}
              disabled={isPending}
              onChange={(e) => setFecha(e.target.value)}
              className={fieldInputClass}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="pos-cantidad" className={fieldLabelClass}>
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
              className={`${fieldInputClass} tabular-nums`}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={isPending || !saborSeleccionadoId}
          onClick={handleRegistrarVenta}
          className="mt-2 w-full rounded-2xl border-2 border-transparent bg-orange-500 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isPending ? 'Registrando…' : 'REGISTRAR VENTA'}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <p
        className="mb-1.5 flex w-full max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[10px] leading-snug text-gray-500 sm:mb-2 sm:justify-start sm:gap-x-3 sm:text-left sm:text-sm"
        aria-label="Leyenda de inventario: Alto desde 4, Medio de 1 a 3, Agotado en 0"
      >
        <span className="shrink-0 whitespace-nowrap font-medium">Inventario:</span>
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

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500 sm:mb-3 sm:text-xs">
        Toca un sabor para vender
      </p>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
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
              className={`relative flex min-h-[4.25rem] flex-col items-center justify-center rounded-xl border-2 px-1 py-2 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[5.5rem] sm:rounded-2xl sm:px-2 sm:py-3 ${
                recienVendido
                  ? 'border-profit bg-green-50 shadow-md'
                  : seleccionado
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-400/40'
                    : sinStock
                      ? 'border-stone-200 bg-stone-100'
                      : 'border-brand/30 bg-white shadow-sm hover:border-brand hover:bg-orange-50'
              }`}
            >
              <span
                className={`absolute right-1 top-1 h-1.5 w-1.5 shrink-0 rounded-full sm:right-2 sm:top-2 sm:h-2 sm:w-2 ${
                  semaforo === 'verde'
                    ? 'bg-green-500'
                    : semaforo === 'naranja'
                      ? 'bg-orange-500'
                      : 'bg-stone-400'
                }`}
                aria-hidden
              />
              <span className="line-clamp-2 text-[10px] font-bold leading-tight text-stone-900 sm:text-sm">
                {sabor.sabor_nombre}
              </span>
              <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-brand-dark sm:mt-1 sm:text-xs">
                {formatCurrency(sabor.precio_venta)}
              </span>
              <span
                className={`mt-1 rounded-full px-1.5 py-px text-[8px] font-bold tabular-nums sm:mt-1.5 sm:px-2 sm:py-0.5 sm:text-[10px] ${
                  sinStock
                    ? 'bg-stone-200 text-stone-600'
                    : 'bg-brand text-white'
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
        <p className="mt-4 text-center text-xs font-semibold text-brand-dark">
          Registrando venta…
        </p>
      ) : null}
    </>
  );
}
