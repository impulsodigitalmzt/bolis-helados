'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  compactInputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui/fieldStyles';
import { revalidarVistasDeCostos } from '@/app/actions/costos';
import {
  createInsumo,
  precioEfectivoInsumo,
  updateInsumosBatch,
  type InsumoUpdatePayload,
} from '@/lib/queries/insumos';
import type { Insumo } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/format';

interface InsumosConfigListProps {
  initialInsumos: Insumo[];
}

type DraftRow = {
  precio: string;
  tamano_paquete: string;
  cantidad_actual: string;
  en_oferta: boolean;
  precio_oferta: string;
};

type Draft = Record<string, DraftRow>;

const thClass =
  'sticky top-0 z-[1] border border-stone-200 bg-stone-100 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-stone-600';
const tdClass = 'border border-stone-200 px-2 py-1.5 align-middle';

function toDraft(insumos: Insumo[]): Draft {
  return Object.fromEntries(
    insumos.map((i) => [
      i.id,
      {
        precio: String(i.precio),
        tamano_paquete: String(i.tamano_paquete ?? 1),
        cantidad_actual: String(i.cantidad_actual ?? 0),
        en_oferta: i.en_oferta ?? false,
        precio_oferta:
          i.precio_oferta != null ? String(i.precio_oferta) : '',
      },
    ]),
  );
}

function rowIsDirty(insumo: Insumo, d: DraftRow | undefined): boolean {
  if (!d) return false;
  const precio = parseFloat(d.precio);
  const tamano = parseFloat(d.tamano_paquete);
  const stock = parseFloat(d.cantidad_actual);
  const precioOferta = d.precio_oferta ? parseFloat(d.precio_oferta) : null;
  if (precio !== insumo.precio) return true;
  if (tamano !== (insumo.tamano_paquete ?? 1)) return true;
  if (stock !== (insumo.cantidad_actual ?? 0)) return true;
  if (d.en_oferta !== (insumo.en_oferta ?? false)) return true;
  const savedOferta = insumo.precio_oferta ?? null;
  if (d.en_oferta) {
    return precioOferta !== savedOferta;
  }
  return savedOferta != null;
}

interface InsumoRowFieldsProps {
  insumo: Insumo;
  d: DraftRow;
  dirty: boolean;
  onUpdate: (patch: Partial<DraftRow>) => void;
  layout: 'card' | 'table';
}

function InsumoRowFields({
  insumo,
  d,
  dirty,
  onUpdate,
  layout,
}: InsumoRowFieldsProps) {
  const precioNuevoEl = (
    <div className="relative min-w-[5.5rem]">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">
        $
      </span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={d.precio}
        onChange={(e) => onUpdate({ precio: e.target.value })}
        className={`${compactInputClass} pl-6`}
        aria-label={`Precio nuevo de ${insumo.nombre}`}
      />
    </div>
  );

  const ofertaEl = (
    <label className="flex cursor-pointer items-center justify-center gap-1.5">
      <input
        type="checkbox"
        checked={d.en_oferta}
        onChange={(e) =>
          onUpdate({
            en_oferta: e.target.checked,
            precio_oferta: e.target.checked
              ? d.precio_oferta || String(insumo.precio)
              : '',
          })
        }
        className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand/30"
        aria-label={`Oferta en ${insumo.nombre}`}
      />
      {layout === 'card' ? (
        <span className="text-xs text-stone-600">Oferta</span>
      ) : null}
    </label>
  );

  const precioOfertaEl = (
    <div className="relative min-w-[5.5rem]">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">
        $
      </span>
      <input
        type="number"
        min={0}
        step="0.01"
        disabled={!d.en_oferta}
        value={d.precio_oferta}
        onChange={(e) => onUpdate({ precio_oferta: e.target.value })}
        placeholder="—"
        className={`${compactInputClass} pl-6 disabled:opacity-40`}
        aria-label={`Precio oferta de ${insumo.nombre}`}
      />
    </div>
  );

  const tamanoEl = (
    <input
      type="number"
      min={0.0001}
      step="0.0001"
      value={d.tamano_paquete}
      onChange={(e) => onUpdate({ tamano_paquete: e.target.value })}
      className={`${compactInputClass} max-w-[5.5rem] tabular-nums`}
      aria-label={`Tamaño de paquete de ${insumo.nombre}`}
    />
  );

  const stockEl = (
    <input
      type="number"
      min={0}
      step="0.0001"
      value={d.cantidad_actual}
      onChange={(e) => onUpdate({ cantidad_actual: e.target.value })}
      className={`${compactInputClass} max-w-[5.5rem] tabular-nums`}
      aria-label={`Stock de ${insumo.nombre}`}
    />
  );

  if (layout === 'table') {
    return (
      <>
        <td className={`${tdClass} min-w-[10rem] font-semibold text-stone-900`}>
          {insumo.nombre}
          {dirty ? (
            <span className="ml-1.5 inline-block rounded bg-orange-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-900">
              editado
            </span>
          ) : null}
        </td>
        <td className={`${tdClass} w-16 text-center text-xs text-stone-600`}>
          {insumo.unidad}
        </td>
        <td className={`${tdClass} w-28`}>{tamanoEl}</td>
        <td className={`${tdClass} w-28`}>{stockEl}</td>
        <td className={`${tdClass} w-28 text-right tabular-nums`}>
          <span
            className={
              insumo.en_oferta
                ? 'text-stone-400 line-through'
                : 'font-semibold text-stone-800'
            }
          >
            {formatCurrency(insumo.precio)}
          </span>
          {insumo.en_oferta && insumo.precio_oferta != null ? (
            <p className="text-xs font-bold text-brand-dark">
              {formatCurrency(insumo.precio_oferta)}
            </p>
          ) : null}
          <p className="text-[10px] text-stone-400">
            ef. {formatCurrency(precioEfectivoInsumo(insumo))}
          </p>
        </td>
        <td className={tdClass}>{precioNuevoEl}</td>
        <td className={`${tdClass} w-16 text-center`}>{ofertaEl}</td>
        <td className={tdClass}>{precioOfertaEl}</td>
      </>
    );
  }

  return (
    <>
      <div className="min-w-0 md:col-span-1">
        <p
          className="text-sm font-semibold leading-snug text-stone-900 break-words"
          title={insumo.nombre}
        >
          {insumo.nombre}
        </p>
        <p className="text-[10px] text-stone-400">
          Paquete: {insumo.tamano_paquete ?? 1} {insumo.unidad} · /{insumo.unidad}
          {d.en_oferta ? (
            <span className="ml-1 font-semibold text-brand-dark">· en oferta</span>
          ) : null}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase text-stone-400">
            Paquete
          </span>
          {tamanoEl}
          <span className="text-[10px] text-stone-400">{insumo.unidad}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase text-stone-400">
            Stock
          </span>
          {stockEl}
          <span className="text-[10px] text-stone-400">{insumo.unidad}</span>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 md:mt-1 md:block md:text-right">
        <span className="text-[10px] font-semibold uppercase text-stone-400 md:hidden">
          Actual
        </span>
        <div className="text-right">
          <span
            className={`text-sm font-bold tabular-nums ${
              insumo.en_oferta ? 'text-stone-400 line-through' : 'text-stone-800'
            }`}
          >
            {formatCurrency(insumo.precio)}
          </span>
          {insumo.en_oferta && insumo.precio_oferta != null ? (
            <p className="text-xs font-bold tabular-nums text-brand-dark">
              {formatCurrency(insumo.precio_oferta)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2 md:mt-1">
        <span className="w-14 shrink-0 text-[10px] font-semibold uppercase text-stone-400 md:hidden">
          Nuevo
        </span>
        <div className="flex-1 md:flex-none">{precioNuevoEl}</div>
      </div>

      <div className="mt-1 flex items-center gap-2 md:mt-1 md:justify-center">
        <span className="text-[10px] font-semibold uppercase text-stone-400 md:sr-only">
          Oferta
        </span>
        {ofertaEl}
      </div>

      <div className="mt-1 flex items-center gap-2 md:mt-1">
        <span className="w-14 shrink-0 text-[10px] font-semibold uppercase text-stone-400 md:hidden">
          $ Oferta
        </span>
        <div className="flex-1 md:flex-none">{precioOfertaEl}</div>
      </div>
    </>
  );
}

export function InsumosConfigList({ initialInsumos }: InsumosConfigListProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(initialInsumos));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showNew, setShowNew] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newPrecio, setNewPrecio] = useState('');
  const [newUnidad, setNewUnidad] = useState('kg');
  const [newStock, setNewStock] = useState('0');

  useEffect(() => {
    setDraft(toDraft(initialInsumos));
  }, [initialInsumos]);

  const dirtyCount = useMemo(
    () =>
      initialInsumos.filter((i) => rowIsDirty(i, draft[i.id])).length,
    [initialInsumos, draft],
  );

  const updateRow = useCallback(
    (id: string, patch: Partial<DraftRow>) => {
      setDraft((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...patch },
      }));
    },
    [],
  );

  function validateAndBuildUpdates(): InsumoUpdatePayload[] | null {
    const updates: InsumoUpdatePayload[] = [];

    for (const insumo of initialInsumos) {
      const d = draft[insumo.id];
      if (!d || !rowIsDirty(insumo, d)) continue;

      const precio = parseFloat(d.precio);
      const tamano_paquete = parseFloat(d.tamano_paquete);
      const cantidad_actual = parseFloat(d.cantidad_actual);
      if (Number.isNaN(precio) || precio < 0) {
        setError(`Precio inválido en «${insumo.nombre}».`);
        return null;
      }
      if (Number.isNaN(tamano_paquete) || tamano_paquete <= 0) {
        setError(`Tamaño de paquete inválido en «${insumo.nombre}».`);
        return null;
      }
      if (Number.isNaN(cantidad_actual) || cantidad_actual < 0) {
        setError(`Stock inválido en «${insumo.nombre}».`);
        return null;
      }

      let precio_oferta: number | null = null;
      if (d.en_oferta) {
        precio_oferta = parseFloat(d.precio_oferta);
        if (Number.isNaN(precio_oferta) || precio_oferta < 0) {
          setError(`Precio de oferta inválido en «${insumo.nombre}».`);
          return null;
        }
      }

      updates.push({
        id: insumo.id,
        precio,
        tamano_paquete,
        cantidad_actual,
        en_oferta: d.en_oferta,
        precio_oferta,
      });
    }

    return updates;
  }

  function handleSaveAll() {
    const updates = validateAndBuildUpdates();
    if (!updates) return;
    if (updates.length === 0) return;

    setError(null);
    startTransition(async () => {
      try {
        const n = await updateInsumosBatch(updates);
        await revalidarVistasDeCostos();
        setSuccessMessage(
          `${n} insumo${n === 1 ? '' : 's'} actualizado${n === 1 ? '' : 's'}. Costos de todos los sabores recalculados.`,
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudieron guardar los cambios',
        );
      }
    });
  }

  async function handleCreate() {
    const precio = parseFloat(newPrecio);
    const stock = parseFloat(newStock);
    if (!newNombre.trim()) {
      setError('Escribe el nombre del insumo.');
      return;
    }
    if (Number.isNaN(precio) || precio < 0) {
      setError('Precio inválido.');
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      setError('Stock inicial inválido.');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createInsumo({
          nombre: newNombre.trim(),
          precio,
          unidad: newUnidad.trim() || 'u',
          cantidad_actual: stock,
        });
        setSuccessMessage(`Insumo «${newNombre}» creado`);
        setShowNew(false);
        setNewNombre('');
        setNewPrecio('');
        setNewStock('0');
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo crear el insumo',
        );
      }
    });
  }

  if (initialInsumos.length === 0 && !showNew) {
    return (
      <div className="card-premium p-6 text-center text-sm text-stone-500">
        No hay insumos. Crea el primero para armar recetas.
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
        <div className="mb-3 rounded-xl border border-red-200/80 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-stone-500">
          Aquí están los precios maestros (como la hoja de insumos del Excel).
          Preparaciones y productos solo guardan cantidades; su costo sale de
          estos precios y se recalcula solo al guardar.
        </p>
        <span
          className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700"
          aria-label={`${initialInsumos.length} insumos en total`}
        >
          Total: {initialInsumos.length}{' '}
          {initialInsumos.length === 1 ? 'insumo' : 'insumos'}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className={`${secondaryButtonClass} text-xs md:w-auto`}
        >
          {showNew ? 'Cancelar' : '+ Nuevo insumo'}
        </button>
        {dirtyCount > 0 ? (
          <span className="badge-brand">
            {dirtyCount} cambio{dirtyCount === 1 ? '' : 's'}
          </span>
        ) : null}
        <p className="hidden text-xs text-stone-500 md:block">
          Usa Tab para saltar entre celdas · Enter para editar · Guarda al
          terminar
        </p>
      </div>

      {showNew ? (
        <div className="card-premium mb-3 grid gap-2 p-3 md:grid-cols-5">
          <input
            placeholder="Nombre"
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            className={`${compactInputClass} md:col-span-2`}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Precio"
            value={newPrecio}
            onChange={(e) => setNewPrecio(e.target.value)}
            className={compactInputClass}
          />
          <input
            type="number"
            min={0}
            step="0.0001"
            placeholder="Stock"
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
            className={compactInputClass}
          />
          <div className="flex gap-2">
            <input
              placeholder="Unidad"
              value={newUnidad}
              onChange={(e) => setNewUnidad(e.target.value)}
              className={compactInputClass}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="shrink-0 rounded-lg bg-brand px-3 text-xs font-bold text-white"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      <div className="card-premium overflow-hidden">
        {/* Móvil: tarjetas */}
        <ul className="divide-y divide-stone-100 md:hidden">
          {initialInsumos.map((insumo) => {
            const d = draft[insumo.id];
            if (!d) return null;
            const dirty = rowIsDirty(insumo, d);

            return (
              <li
                key={insumo.id}
                className={`grid grid-cols-1 gap-0 px-3 py-2.5 ${
                  dirty ? 'bg-orange-50' : 'hover:bg-stone-50/50'
                }`}
              >
                <InsumoRowFields
                  insumo={insumo}
                  d={d}
                  dirty={dirty}
                  layout="card"
                  onUpdate={(patch) => updateRow(insumo.id, patch)}
                />
              </li>
            );
          })}
        </ul>

        {/* Tablet / PC: tabla tipo Excel */}
        <div className="hidden md:block">
          <div className="-mx-px max-h-[min(70vh,42rem)] overflow-auto overscroll-contain">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={`${thClass} min-w-[10rem]`}>Insumo</th>
                  <th className={`${thClass} w-16 text-center`}>Unidad</th>
                  <th className={`${thClass} w-28`}>Tamaño paq.</th>
                  <th className={`${thClass} w-28`}>Stock</th>
                  <th className={`${thClass} w-28 text-right`}>Precio actual</th>
                  <th className={`${thClass} w-32`}>Precio nuevo</th>
                  <th className={`${thClass} w-16 text-center`}>Oferta</th>
                  <th className={`${thClass} w-32`}>$ Oferta</th>
                </tr>
              </thead>
              <tbody>
                {initialInsumos.map((insumo) => {
                  const d = draft[insumo.id];
                  if (!d) return null;
                  const dirty = rowIsDirty(insumo, d);

                  return (
                    <tr
                      key={insumo.id}
                      className={
                        dirty
                          ? 'bg-orange-50'
                          : 'bg-white even:bg-stone-50/60 hover:bg-stone-50'
                      }
                    >
                      <InsumoRowFields
                        insumo={insumo}
                        d={d}
                        dirty={dirty}
                        layout="table"
                        onUpdate={(patch) => updateRow(insumo.id, patch)}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="h-20 md:h-24" aria-hidden />

      <div className="fixed bottom-[4.75rem] left-0 right-0 z-40 safe-area-pb md:static md:mt-4 md:pb-0">
        <div className="app-container md:!max-w-none md:!px-0">
          <button
            type="button"
            disabled={isPending || dirtyCount === 0}
            onClick={handleSaveAll}
            className={`${primaryButtonClass} md:max-w-md`}
          >
            {isPending
              ? 'Guardando…'
              : dirtyCount > 0
                ? `Guardar cambios (${dirtyCount})`
                : 'Sin cambios pendientes'}
          </button>
        </div>
      </div>
    </>
  );
}
