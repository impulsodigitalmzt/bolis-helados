'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  fieldInputClass,
  fieldLabelClass,
  fieldSelectClass,
  primaryButtonClass,
} from '@/components/ui/fieldStyles';
import { insertVenta } from '@/lib/queries/ventas';
import type { Sabor, Vendedora } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/format';

interface VentaFormProps {
  sabores: Sabor[];
  vendedoras: Vendedora[];
}

const FORM_ID = 'venta-form';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VentaForm({ sabores, vendedoras }: VentaFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fecha, setFecha] = useState(todayISO);
  const [saborId, setSaborId] = useState('');
  const [vendedoraId, setVendedoraId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const saborSeleccionado = sabores.find((s) => s.id === saborId);
  const cantidadNum = Math.max(1, parseInt(cantidad, 10) || 0);

  const previewIngreso = saborSeleccionado
    ? cantidadNum * saborSeleccionado.precio_venta
    : null;

  function resetForm() {
    setFecha(todayISO());
    setSaborId('');
    setVendedoraId('');
    setCantidad('1');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!saborId || !vendedoraId) {
      setError('Selecciona un sabor y una vendedora.');
      return;
    }

    if (cantidadNum < 1) {
      setError('La cantidad debe ser al menos 1.');
      return;
    }

    startTransition(async () => {
      try {
        await insertVenta({
          fecha,
          sabor_id: saborId,
          vendedora_id: vendedoraId,
          cantidad: cantidadNum,
        });

        const saborNombre =
          sabores.find((s) => s.id === saborId)?.nombre ?? 'Sabor';
        const vendedoraNombre =
          vendedoras.find((v) => v.id === vendedoraId)?.nombre ?? 'Vendedora';

        setSuccessMessage(
          `¡Venta guardada! ${cantidadNum} ${saborNombre} · ${vendedoraNombre}`,
        );
        resetForm();
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo guardar la venta',
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

      <div className="card-premium overflow-hidden">
        <form
          id={FORM_ID}
          onSubmit={handleSubmit}
          className="space-y-5 p-5 pb-4"
        >
          {error ? (
            <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl bg-stone-50/80 p-4 ring-1 ring-stone-100">
            <label htmlFor="fecha" className={fieldLabelClass}>
              Fecha de venta
            </label>
            <input
              id="fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={fieldInputClass}
            />
          </div>

          <div className="rounded-2xl bg-stone-50/80 p-4 ring-1 ring-stone-100">
            <label htmlFor="sabor" className={fieldLabelClass}>
              Sabor vendido
            </label>
            <select
              id="sabor"
              required
              value={saborId}
              onChange={(e) => setSaborId(e.target.value)}
              className={fieldSelectClass}
            >
              <option value="">Selecciona un sabor</option>
              {sabores.map((sabor) => (
                <option key={sabor.id} value={sabor.id}>
                  {sabor.nombre} — {formatCurrency(sabor.precio_venta)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-stone-50/80 p-4 ring-1 ring-stone-100">
            <label htmlFor="cantidad" className={fieldLabelClass}>
              Cantidad de bolis
            </label>
            <input
              id="cantidad"
              type="number"
              inputMode="numeric"
              min={1}
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Ej: 5"
              className={fieldInputClass}
            />
            {previewIngreso !== null ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-brand px-3 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-white">
                  Ingreso estimado
                </span>
                <span className="text-base font-bold tabular-nums text-white">
                  {formatCurrency(previewIngreso)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-stone-50/80 p-4 ring-1 ring-stone-100">
            <label htmlFor="vendedora" className={fieldLabelClass}>
              Vendedora
            </label>
            <select
              id="vendedora"
              required
              value={vendedoraId}
              onChange={(e) => setVendedoraId(e.target.value)}
              className={fieldSelectClass}
            >
              <option value="">Selecciona una vendedora</option>
              {vendedoras.map((vendedora) => (
                <option key={vendedora.id} value={vendedora.id}>
                  {vendedora.nombre}
                  {vendedora.comision_por_boli > 0
                    ? ` · ${formatCurrency(vendedora.comision_por_boli)}/boli`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="h-20" aria-hidden />
        </form>
      </div>

      <div className="fixed bottom-[4.75rem] left-0 right-0 z-40">
        <div className="app-container">
        <button
          type="submit"
          form={FORM_ID}
          disabled={isPending || sabores.length === 0 || vendedoras.length === 0}
          className={primaryButtonClass}
        >
          {isPending ? 'Guardando…' : 'Guardar venta'}
        </button>
        <p className="mt-2 text-center text-[11px] text-stone-400">
          Comisión $0 en hermanas · listo para otros negocios
        </p>
        </div>
      </div>
    </>
  );
}
