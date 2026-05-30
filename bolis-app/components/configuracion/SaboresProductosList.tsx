'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  fieldInputClass,
  fieldLabelClass,
  secondaryButtonClass,
} from '@/components/ui/fieldStyles';
import { updateSaborPrecioVenta } from '@/lib/queries/sabores';
import type { Sabor } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/format';
import { esNombrePreparacion } from '@/lib/utils/preparaciones';

function esPreparacion(sabor: Sabor): boolean {
  return sabor.es_preparacion || esNombrePreparacion(sabor.nombre);
}

interface SaboresProductosListProps {
  initialSabores: Sabor[];
}

type Draft = Record<string, { precio_venta: string }>;

function toDraft(sabores: Sabor[]): Draft {
  return Object.fromEntries(
    sabores.map((s) => [s.id, { precio_venta: String(s.precio_venta) }]),
  );
}

function tipoBadgeClass(tipo: string) {
  return tipo === 'agua' ? 'badge-accent' : 'badge-brand';
}

export function SaboresProductosList({ initialSabores }: SaboresProductosListProps) {
  const productos = useMemo(
    () => initialSabores.filter((s) => !esPreparacion(s)),
    [initialSabores],
  );
  const preparaciones = useMemo(
    () => initialSabores.filter((s) => esPreparacion(s)),
    [initialSabores],
  );

  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(productos));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setDraft(toDraft(productos));
  }, [productos]);

  const updateField = useCallback((id: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { precio_venta: value },
    }));
  }, []);

  function isDirty(sabor: Sabor): boolean {
    const d = draft[sabor.id];
    return d ? parseFloat(d.precio_venta) !== sabor.precio_venta : false;
  }

  async function handleSave(sabor: Sabor) {
    const precio = parseFloat(draft[sabor.id]?.precio_venta ?? '');
    if (Number.isNaN(precio) || precio < 0) {
      setError('El precio de venta debe ser válido.');
      return;
    }

    setError(null);
    setSavingId(sabor.id);

    startTransition(async () => {
      try {
        await updateSaborPrecioVenta(sabor.id, precio);
        setSuccessMessage(`Precio de «${sabor.nombre}» actualizado`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo guardar',
        );
      } finally {
        setSavingId(null);
      }
    });
  }

  if (productos.length === 0 && preparaciones.length === 0) {
    return (
      <div className="card-premium p-6 text-center text-sm text-stone-500">
        No hay sabores registrados.
      </div>
    );
  }

  return (
    <>
      {successMessage ? (
        <SuccessToast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <p className="mb-3 text-sm font-medium text-stone-800">
        El costo por boli viene de los insumos (precio y tamaño de paquete) y de
        las cantidades de cada receta; cambia solo al editar insumos o recetas.
        El precio de venta lo defines tú aquí.
      </p>

      {preparaciones.length > 0 ? (
        <div className="mb-4 rounded-xl border-2 border-stone-400 bg-stone-200 px-3 py-2.5">
          <p className="text-xs font-medium text-stone-800">
            La base de leche (insumos compartidos) no se vende; edítala aparte:
          </p>
          <ul className="mt-2 space-y-1.5">
            {preparaciones.map((prep) => (
              <li key={prep.id}>
                <Link
                  href={`/configuracion/productos/${prep.id}/receta`}
                  className="text-sm font-semibold text-brand hover:text-brand-dark"
                >
                  {prep.nombre}
                  {prep.costo_produccion_unitario > 0 ? (
                    <span className="ml-1 font-normal text-stone-500">
                      · lote {formatCurrency(prep.costo_produccion_unitario)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {productos.length === 0 ? (
        <div className="card-premium p-6 text-center text-sm text-stone-500">
          No hay productos de venta. Configura la preparación base arriba.
        </div>
      ) : null}

      <div className="space-y-4">
        {productos.map((sabor) => {
          const d = draft[sabor.id];
          const precio = parseFloat(d?.precio_venta ?? '0') || 0;
          const costoUnitario = sabor.costo_produccion_unitario;
          const costoLote = costoUnitario * (sabor.rendimiento > 0 ? sabor.rendimiento : 1);
          const margen = precio - costoUnitario;
          const dirty = isDirty(sabor);
          const isSaving = savingId === sabor.id;

          return (
            <article key={sabor.id} className="card-premium overflow-hidden">
              <div className="card-premium-header flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words font-bold text-stone-900">{sabor.nombre}</h3>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${tipoBadgeClass(sabor.tipo)}`}
                  >
                    {sabor.tipo}
                  </span>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-700">
                    Costo / boli
                  </p>
                  <p className="text-xl font-extrabold tabular-nums text-cost">
                    {formatCurrency(costoUnitario)}
                  </p>
                  <p className="text-[11px] font-medium tabular-nums text-stone-700">
                    Lote ({sabor.rendimiento} pz): {formatCurrency(costoLote)}
                  </p>
                  <p
                    className={`text-xs font-semibold tabular-nums ${margen >= 0 ? 'text-profit' : 'text-cost'}`}
                  >
                    Margen {formatCurrency(margen)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`precio-${sabor.id}`}
                    className={fieldLabelClass}
                  >
                    Precio venta
                  </label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                      $
                    </span>
                    <input
                      id={`precio-${sabor.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={d?.precio_venta ?? ''}
                      onChange={(e) => updateField(sabor.id, e.target.value)}
                      className={`${fieldInputClass} !mt-0 pl-8`}
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <Link
                    href={`/configuracion/productos/${sabor.id}/receta`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-md shadow-brand/30 transition hover:bg-brand-dark"
                  >
                    <span aria-hidden>📋</span>
                    Editar receta
                  </Link>
                  <button
                    type="button"
                    disabled={!dirty || isSaving}
                    onClick={() => handleSave(sabor)}
                    className={`${secondaryButtonClass} w-full ${
                      dirty
                        ? '!border-brand/50 !bg-brand !text-white hover:!bg-brand-dark'
                        : ''
                    }`}
                  >
                    {isSaving
                      ? 'Guardando…'
                      : dirty
                        ? 'Guardar precio'
                        : 'Precio al día'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
