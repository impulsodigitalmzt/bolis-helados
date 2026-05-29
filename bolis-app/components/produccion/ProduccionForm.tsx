'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  fieldInputClass,
  fieldLabelClass,
  fieldSelectClass,
  primaryButtonClass,
} from '@/components/ui/fieldStyles';
import {
  previewConsumoProduccion,
  registrarProduccion,
  type ConsumoInsumoPreview,
} from '@/lib/queries/produccion';
import type { HistorialProduccion, Sabor } from '@/lib/types/database';
import { formatNumber } from '@/lib/utils/format';

interface ProduccionFormProps {
  sabores: Sabor[];
  historialReciente: HistorialProduccion[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatQty(value: number, unidad: string): string {
  const n = formatNumber(value);
  return `${n} ${unidad}`;
}

export function ProduccionForm({
  sabores,
  historialReciente,
}: ProduccionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fecha, setFecha] = useState(todayISO);
  const [saborId, setSaborId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ConsumoInsumoPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const saborSeleccionado = sabores.find((s) => s.id === saborId);
  const cantidadNum = Math.max(0, parseInt(cantidad, 10) || 0);

  useEffect(() => {
    if (!saborSeleccionado || cantidadNum <= 0) {
      setPreview([]);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    previewConsumoProduccion(saborSeleccionado, cantidadNum)
      .then((items) => {
        if (!cancelled) setPreview(items);
      })
      .catch(() => {
        if (!cancelled) setPreview([]);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [saborSeleccionado, cantidadNum]);

  const previewOk =
    preview.length > 0 && preview.every((p) => p.suficiente);
  const previewFalta = preview.some((p) => !p.suficiente);

  function resetForm() {
    setFecha(todayISO());
    setSaborId('');
    setCantidad('');
    setPreview([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!saborId) {
      setError('Selecciona un sabor.');
      return;
    }
    if (cantidadNum <= 0) {
      setError('La cantidad producida debe ser mayor a 0.');
      return;
    }
    if (preview.length === 0) {
      setError(
        'Este sabor no tiene receta. Configúrala en Productos → Editar receta.',
      );
      return;
    }
    if (!previewOk) {
      setError(
        'No hay stock suficiente de uno o más insumos. Revisa el inventario.',
      );
      return;
    }

    startTransition(async () => {
      try {
        await registrarProduccion({
          sabor_id: saborId,
          cantidad: cantidadNum,
          fecha,
        });

        const nombre = saborSeleccionado?.nombre ?? 'Sabor';
        setSuccessMessage(
          `Producción registrada: ${cantidadNum} ${nombre}. Inventario actualizado.`,
        );
        resetForm();
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo registrar la producción',
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

      <form id="produccion-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="card-premium space-y-4 p-4">
          <div>
            <label htmlFor="prod-fecha" className={fieldLabelClass}>
              Fecha
            </label>
            <input
              id="prod-fecha"
              type="date"
              value={fecha}
              disabled={isPending}
              onChange={(e) => setFecha(e.target.value)}
              className={fieldInputClass}
            />
          </div>

          <div>
            <label htmlFor="prod-sabor" className={fieldLabelClass}>
              Sabor
            </label>
            <select
              id="prod-sabor"
              value={saborId}
              disabled={isPending}
              onChange={(e) => setSaborId(e.target.value)}
              className={fieldSelectClass}
            >
              <option value="">Seleccionar sabor…</option>
              {sabores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} (lote: {s.rendimiento} pzas)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="prod-cantidad" className={fieldLabelClass}>
              Cantidad de bolis producidos
            </label>
            <input
              id="prod-cantidad"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder="Ej. 24"
              value={cantidad}
              disabled={isPending}
              onChange={(e) => setCantidad(e.target.value)}
              className={`${fieldInputClass} tabular-nums`}
            />
            {saborSeleccionado && cantidadNum > 0 ? (
              <p className="mt-2 text-xs text-stone-500">
                Factor de lote: {cantidadNum} ÷ {saborSeleccionado.rendimiento}{' '}
                ={' '}
                <span className="font-semibold tabular-nums text-stone-700">
                  {(cantidadNum / saborSeleccionado.rendimiento).toFixed(4)}
                </span>
                × receta
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {saborId && cantidadNum > 0 ? (
          <div className="card-premium overflow-hidden p-0">
            <div className="border-b border-stone-200 bg-stone-50 px-3 py-2.5">
              <h3 className="text-sm font-bold text-stone-800">
                Insumos a descontar
              </h3>
              {previewLoading ? (
                <p className="text-xs text-stone-500">Calculando…</p>
              ) : preview.length === 0 ? (
                <p className="text-xs text-amber-800">
                  Sin receta para este sabor.{' '}
                  <Link
                    href={`/configuracion/productos/${saborId}/receta`}
                    className="font-semibold text-brand underline"
                  >
                    Configurar receta
                  </Link>
                </p>
              ) : previewFalta ? (
                <p className="text-xs font-semibold text-red-700">
                  Stock insuficiente en uno o más insumos
                </p>
              ) : (
                <p className="text-xs font-semibold text-profit">
                  Stock suficiente para producir
                </p>
              )}
            </div>

            {preview.length > 0 ? (
              <ul className="divide-y divide-stone-100">
                {preview.map((item) => (
                  <li
                    key={item.insumo_id}
                    className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 ${
                      item.suficiente ? '' : 'bg-red-50'
                    }`}
                  >
                    <span className="text-sm font-semibold text-stone-900">
                      {item.nombre}
                    </span>
                    <div className="text-right text-xs">
                      <p
                        className={`font-bold tabular-nums ${
                          item.suficiente ? 'text-stone-800' : 'text-red-700'
                        }`}
                      >
                        −{formatQty(item.consumo, item.unidad)}
                      </p>
                      <p className="text-stone-500">
                        Stock: {formatQty(item.stock_actual, item.unidad)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {historialReciente.length > 0 ? (
          <div className="card-premium p-4">
            <h3 className="mb-3 text-sm font-bold text-stone-800">
              Últimas producciones
            </h3>
            <ul className="space-y-2">
              {historialReciente.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-stone-800">
                    {h.sabor?.nombre ?? 'Sabor'}
                  </span>
                  <span className="tabular-nums text-stone-600">
                    {h.cantidad} pzas · {h.fecha}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="h-20" aria-hidden />
      </form>

      <div className="fixed bottom-[4.75rem] left-0 right-0 z-40 border-t border-stone-200/90 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgb(0_0_0_/0.08)] backdrop-blur-sm safe-area-pb sm:px-4">
        <div className="app-container w-full">
          <button
            type="submit"
            form="produccion-form"
            disabled={
              isPending ||
              !saborId ||
              cantidadNum <= 0 ||
              preview.length === 0 ||
              !previewOk
            }
            className={primaryButtonClass}
          >
            {isPending
              ? 'Registrando…'
              : 'Registrar y descontar inventario'}
          </button>
        </div>
      </div>
    </>
  );
}
