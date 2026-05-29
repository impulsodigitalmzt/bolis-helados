'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  compactInputClass,
  fieldInputClass,
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui/fieldStyles';
import { precioEfectivoInsumo } from '@/lib/queries/insumos';
import { precioUnitarioInsumo } from '@/lib/utils/costoInsumo';
import {
  costoParcialLinea,
  costoParcialPreparacion,
  guardarRecetaCompleta,
  type RecetaLineaInput,
} from '@/lib/queries/recetas';
import type { Insumo, RecetaDetalle, Sabor } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/format';

interface RecetaEditorProps {
  sabor: Sabor;
  lineas: RecetaDetalle[];
  insumos: Insumo[];
  preparaciones: Sabor[];
}

type DraftRow = {
  key: string;
  /** `insumo:uuid` o `prep:uuid` */
  componente: string;
  cantidad_usada: string;
  /** Columna MEDIDA del Excel */
  medida_usada: string;
};

function lineaToComponente(l: RecetaDetalle): string {
  if (l.preparacion_sabor_id) return `prep:${l.preparacion_sabor_id}`;
  if (l.insumo_id) return `insumo:${l.insumo_id}`;
  return '';
}

function lineasToDraft(lineas: RecetaDetalle[]): DraftRow[] {
  return lineas.map((l) => ({
    key: l.id,
    componente: lineaToComponente(l),
    cantidad_usada: String(l.cantidad_usada),
    medida_usada: String(l.medida_usada ?? 1),
  }));
}

function newEmptyRow(): DraftRow {
  return {
    key: `new-${crypto.randomUUID()}`,
    componente: '',
    cantidad_usada: '',
    medida_usada: '1',
  };
}

function parseComponente(value: string): {
  insumo_id?: string;
  preparacion_sabor_id?: string;
} {
  if (value.startsWith('insumo:')) {
    return { insumo_id: value.slice(7) };
  }
  if (value.startsWith('prep:')) {
    return { preparacion_sabor_id: value.slice(5) };
  }
  return {};
}

const thClass =
  'border border-stone-200 bg-stone-100 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-stone-600';
const tdClass = 'border border-stone-200 px-2 py-1.5 align-middle';

interface IngredienteRowFieldsProps {
  row: DraftRow;
  insumo: Insumo | undefined;
  preparacion: Sabor | undefined;
  parcial: number;
  insumos: Insumo[];
  preparaciones: Sabor[];
  soloInsumos: boolean;
  isPending: boolean;
  onUpdate: (key: string, patch: Partial<DraftRow>) => void;
  onRemove: (key: string) => void;
  layout: 'card' | 'table';
}

function IngredienteRowFields({
  row,
  insumo,
  preparacion,
  parcial,
  insumos,
  preparaciones,
  soloInsumos,
  isPending,
  onUpdate,
  onRemove,
  layout,
}: IngredienteRowFieldsProps) {
  const esPrep = row.componente.startsWith('prep:');

  const selectEl = (
    <select
      value={row.componente}
      disabled={isPending}
      onChange={(e) => {
        const val = e.target.value;
        const patch: Partial<DraftRow> = { componente: val };
        if (val.startsWith('prep:')) {
          patch.cantidad_usada = '1';
          patch.medida_usada = '1';
        }
        onUpdate(row.key, patch);
      }}
      className={`${compactInputClass} font-medium`}
      aria-label="Ingrediente o preparación"
    >
      <option value="">Seleccionar…</option>
      <optgroup label="Insumos">
        {insumos.map((i) => (
          <option key={i.id} value={`insumo:${i.id}`}>
            {i.nombre} (paq {i.tamano_paquete ?? 1} {i.unidad} ·{' '}
            {formatCurrency(precioUnitarioInsumo(i))}/{i.unidad})
          </option>
        ))}
      </optgroup>
      {!soloInsumos && preparaciones.length > 0 ? (
        <optgroup label="Preparaciones (bases)">
          {preparaciones.map((p) => (
            <option key={p.id} value={`prep:${p.id}`}>
              {p.nombre} (lote {formatCurrency(p.costo_produccion_unitario)})
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );

  const cantidadEl = (
    <input
      type="number"
      min={0}
      step="0.0001"
      inputMode="decimal"
      placeholder="0"
      value={row.cantidad_usada}
      disabled={isPending}
      onChange={(e) =>
        onUpdate(row.key, { cantidad_usada: e.target.value })
      }
      className={`${compactInputClass} text-right tabular-nums`}
      aria-label="Cantidad"
    />
  );

  const medidaEl = esPrep ? null : (
    <input
      type="number"
      min={0.0001}
      step="0.0001"
      inputMode="decimal"
      placeholder="1"
      value={row.medida_usada}
      disabled={isPending}
      onChange={(e) =>
        onUpdate(row.key, { medida_usada: e.target.value })
      }
      className={`${compactInputClass} text-right tabular-nums`}
      aria-label="Medida"
    />
  );

  const deleteBtn = (
    <button
      type="button"
      disabled={isPending}
      onClick={() => onRemove(row.key)}
      className={
        layout === 'card'
          ? 'w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100'
          : 'rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100'
      }
    >
      Eliminar
    </button>
  );

  if (layout === 'table') {
    return (
      <>
        <td className={tdClass}>
          {selectEl}
          {insumo ? (
            <p className="mt-0.5 text-[10px] text-stone-400">
              {formatCurrency(precioEfectivoInsumo(insumo))} / {insumo.unidad}
              {insumo.en_oferta ? ' · oferta' : ''}
            </p>
          ) : null}
          {preparacion ? (
            <p className="mt-0.5 text-[10px] text-brand-dark">
              Base · lote {formatCurrency(preparacion.costo_produccion_unitario)}
            </p>
          ) : null}
        </td>
        <td className={`${tdClass} text-right`}>
          <div className="flex gap-1">
            <div className="min-w-0 flex-1">
              <span className="mb-0.5 block text-[10px] text-stone-400">
                {esPrep ? 'Lotes' : 'Cant.'}
              </span>
              {cantidadEl}
            </div>
            {!esPrep ? (
              <div className="w-16 shrink-0">
                <span className="mb-0.5 block text-[10px] text-stone-400">
                  Med.
                </span>
                {medidaEl}
              </div>
            ) : null}
          </div>
        </td>
        <td
          className={`${tdClass} text-right font-semibold tabular-nums text-stone-900`}
        >
          {formatCurrency(parcial)}
        </td>
        <td className={`${tdClass} text-center`}>{deleteBtn}</td>
      </>
    );
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Ingrediente
        </p>
        <p className="shrink-0 text-sm font-bold tabular-nums text-stone-900">
          {formatCurrency(parcial)}
        </p>
      </div>

      <div>
        <label className="sr-only">Insumo</label>
        {selectEl}
        {insumo ? (
          <p className="mt-1 text-[11px] text-stone-500">
            {formatCurrency(precioEfectivoInsumo(insumo))} / {insumo.unidad}
            {insumo.en_oferta ? ' · oferta' : ''}
          </p>
        ) : null}
        {preparacion ? (
          <p className="mt-1 text-[11px] text-brand-dark">
            Preparación · 1 lote ={' '}
            {formatCurrency(preparacion.costo_produccion_unitario)} (receta en
            Productos)
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={fieldLabelClass}>
            {esPrep ? 'Lotes' : 'Cantidad'}
          </label>
          {cantidadEl}
        </div>
        {!esPrep ? (
          <div>
            <label className={fieldLabelClass}>Medida</label>
            {medidaEl}
          </div>
        ) : null}
      </div>

      {deleteBtn}
    </div>
  );
}

function ResumenCostos({
  costoTotal,
  costoUnitario,
  costoBd,
  pendienteGuardar,
  layout,
}: {
  costoTotal: number;
  costoUnitario: number;
  costoBd: number;
  pendienteGuardar: boolean;
  layout: 'card' | 'table';
}) {
  const bdNote = (
    <>
      En base de datos:{' '}
      <span className="font-semibold tabular-nums text-stone-800">
        {formatCurrency(costoBd)}
      </span>
      {pendienteGuardar ? (
        <span className="text-brand-dark"> · guarda para actualizar</span>
      ) : null}
    </>
  );

  if (layout === 'card') {
    return (
      <div className="space-y-2 border-t border-stone-200 bg-stone-50/80 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-stone-600">
            Costo total
          </span>
          <span className="text-lg font-bold tabular-nums text-cost">
            {formatCurrency(costoTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-3 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-stone-700">
            Costo unitario
          </span>
          <span className="text-lg font-bold tabular-nums text-brand-dark">
            {formatCurrency(costoUnitario)}
          </span>
        </div>
        <p className="text-center text-[11px] leading-relaxed text-stone-500">
          {bdNote}
        </p>
      </div>
    );
  }

  return (
    <tfoot>
      <tr className="bg-stone-100">
        <td
          colSpan={2}
          className="border border-stone-200 px-2 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-stone-600"
        >
          Costo total de la receta
        </td>
        <td className="border border-stone-200 px-2 py-2.5 text-right text-base font-bold tabular-nums text-cost">
          {formatCurrency(costoTotal)}
        </td>
        <td className="border border-stone-200" />
      </tr>
      <tr className="bg-orange-50">
        <td
          colSpan={2}
          className="border border-stone-200 px-2 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-stone-700"
        >
          Costo unitario (total ÷ rendimiento)
        </td>
        <td className="border border-stone-200 px-2 py-2.5 text-right text-base font-bold tabular-nums text-brand-dark">
          {formatCurrency(costoUnitario)}
        </td>
        <td className="border border-stone-200" />
      </tr>
      <tr className="bg-white">
        <td
          colSpan={4}
          className="border border-stone-200 px-2 py-2 text-center text-[11px] text-stone-500"
        >
          {bdNote}
        </td>
      </tr>
    </tfoot>
  );
}

export function RecetaEditor({
  sabor,
  lineas,
  insumos,
  preparaciones,
}: RecetaEditorProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [nombre, setNombre] = useState(sabor.nombre);
  const [rendimiento, setRendimiento] = useState(
    String(sabor.rendimiento ?? 1),
  );
  const [rows, setRows] = useState<DraftRow[]>(() =>
    lineas.length > 0 ? lineasToDraft(lineas) : [newEmptyRow()],
  );

  const insumosById = useMemo(
    () => new Map(insumos.map((i) => [i.id, i])),
    [insumos],
  );
  const preparacionesById = useMemo(
    () => new Map(preparaciones.map((p) => [p.id, p])),
    [preparaciones],
  );
  const soloInsumos = sabor.es_preparacion;

  const rendimientoNum = Math.max(0, parseFloat(rendimiento) || 0);

  const filasConDatos = rows.filter((r) => r.componente);

  const costoTotal = filasConDatos.reduce((sum, row) => {
    const cantidad = parseFloat(row.cantidad_usada) || 0;
    const medida = parseFloat(row.medida_usada) || 1;
    const parsed = parseComponente(row.componente);
    if (parsed.preparacion_sabor_id) {
      return (
        sum +
        costoParcialPreparacion(
          preparacionesById.get(parsed.preparacion_sabor_id),
          cantidad,
        )
      );
    }
    if (parsed.insumo_id) {
      return (
        sum +
        costoParcialLinea(insumosById.get(parsed.insumo_id), cantidad, medida)
      );
    }
    return sum;
  }, 0);

  const costoUnitario =
    rendimientoNum > 0 ? costoTotal / rendimientoNum : costoTotal;

  const pendienteGuardar =
    rendimientoNum > 0 && costoUnitario !== sabor.costo_produccion_unitario;

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, newEmptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      return next.length > 0 ? next : [newEmptyRow()];
    });
  }

  function handleSave() {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      setError('El nombre del sabor es obligatorio.');
      return;
    }
    if (rendimientoNum <= 0) {
      setError('El rendimiento debe ser mayor a 0.');
      return;
    }

    const lineasValidas: RecetaLineaInput[] = [];
    const usados = new Set<string>();

    for (const row of rows) {
      if (!row.componente) continue;

      const parsed = parseComponente(row.componente);
      const cantidad = parseFloat(row.cantidad_usada);
      const medida = parseFloat(row.medida_usada) || 1;
      const etiqueta =
        parsed.preparacion_sabor_id
          ? preparacionesById.get(parsed.preparacion_sabor_id)?.nombre
          : insumosById.get(parsed.insumo_id ?? '')?.nombre ?? 'ingrediente';

      if (soloInsumos && parsed.preparacion_sabor_id) {
        setError('Una preparación base solo puede llevar insumos.');
        return;
      }

      if (Number.isNaN(cantidad) || cantidad <= 0) {
        setError(`Indica una cantidad válida para «${etiqueta}».`);
        return;
      }

      if (usados.has(row.componente)) {
        setError('No puedes repetir el mismo ingrediente en la receta.');
        return;
      }
      usados.add(row.componente);

      if (parsed.preparacion_sabor_id) {
        if (cantidad > 10) {
          setError(
            `«${etiqueta}»: pon 1 lote (no los gramos del Excel; la medida 2090 no va en cantidad).`,
          );
          return;
        }
        lineasValidas.push({
          preparacion_sabor_id: parsed.preparacion_sabor_id,
          cantidad_usada: cantidad,
          medida_usada: 1,
        });
      } else if (parsed.insumo_id) {
        if (Number.isNaN(medida) || medida <= 0) {
          setError(`Medida inválida en «${etiqueta}».`);
          return;
        }
        lineasValidas.push({
          insumo_id: parsed.insumo_id,
          cantidad_usada: cantidad,
          medida_usada: medida,
        });
      }
    }

    setError(null);
    startTransition(async () => {
      try {
        await guardarRecetaCompleta({
          sabor_id: sabor.id,
          nombre: nombreTrim,
          rendimiento: rendimientoNum,
          lineas: lineasValidas,
        });
        const { revalidarVistasDeCostos } = await import('@/app/actions/costos');
        await revalidarVistasDeCostos();
        setSuccessMessage('Receta guardada correctamente');
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo guardar la receta',
        );
      }
    });
  }

  const rowItems = rows.map((row) => {
    const parsed = parseComponente(row.componente);
    const cantidad = parseFloat(row.cantidad_usada) || 0;
    const medida = parseFloat(row.medida_usada) || 1;
    const insumo = parsed.insumo_id
      ? insumosById.get(parsed.insumo_id)
      : undefined;
    const preparacion = parsed.preparacion_sabor_id
      ? preparacionesById.get(parsed.preparacion_sabor_id)
      : undefined;
    const parcial = preparacion
      ? costoParcialPreparacion(preparacion, cantidad)
      : costoParcialLinea(insumo, cantidad, medida);
    return { row, insumo, preparacion, parcial };
  });

  return (
    <div className="min-w-0 pb-28">
      {successMessage ? (
        <SuccessToast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}

      <Link
        href="/configuracion/productos"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"
      >
        ← Volver a productos
      </Link>

      <div className="card-premium mb-4 p-3 sm:p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Datos del lote
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="receta-nombre" className={fieldLabelClass}>
              Nombre del sabor
            </label>
            <input
              id="receta-nombre"
              type="text"
              value={nombre}
              disabled={isPending}
              onChange={(e) => setNombre(e.target.value)}
              className={fieldInputClass}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="receta-rendimiento" className={fieldLabelClass}>
              Rendimiento (piezas / lote)
            </label>
            <input
              id="receta-rendimiento"
              type="number"
              min={1}
              step="1"
              inputMode="numeric"
              value={rendimiento}
              disabled={isPending}
              onChange={(e) => setRendimiento(e.target.value)}
              className={`${fieldInputClass} tabular-nums`}
            />
          </div>
        </div>
        <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-stone-500">
          <span>
            Tipo:{' '}
            <span className="font-semibold text-stone-700">{sabor.tipo}</span>
          </span>
          <span className="hidden text-stone-300 sm:inline" aria-hidden>
            ·
          </span>
          <span>
            Precio venta:{' '}
            <span className="font-semibold tabular-nums text-stone-800">
              {formatCurrency(sabor.precio_venta)}
            </span>
          </span>
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="card-premium min-w-0 overflow-hidden p-0">
        <div className="flex flex-col gap-2 border-b border-stone-200 bg-stone-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div>
            <h3 className="text-sm font-bold text-stone-800">Ingredientes</h3>
            {!soloInsumos ? (
              <p className="mt-0.5 text-[11px] text-stone-500">
                Insumos: Cantidad y Medida como en Excel. Preparación base:
                <strong className="font-semibold"> 1 lote</strong> (no pongas
                los gramos 2090 en cantidad).
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-stone-500">
                Preparación base: Cantidad y Medida como en tu hoja (ej. leche
                1 × 1500).
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={addRow}
            className={`${secondaryButtonClass} w-full shrink-0 sm:w-auto`}
          >
            <span className="sm:hidden">+ Agregar</span>
            <span className="hidden sm:inline">+ Agregar ingrediente</span>
          </button>
        </div>

        {/* Móvil: tarjetas apiladas */}
        <div className="md:hidden">
          <ul className="divide-y divide-stone-200">
            {rowItems.map(({ row, insumo, preparacion, parcial }) => (
              <li key={row.key}>
                <IngredienteRowFields
                  row={row}
                  insumo={insumo}
                  preparacion={preparacion}
                  parcial={parcial}
                  insumos={insumos}
                  preparaciones={preparaciones}
                  soloInsumos={soloInsumos}
                  isPending={isPending}
                  onUpdate={updateRow}
                  onRemove={removeRow}
                  layout="card"
                />
              </li>
            ))}
          </ul>
          <ResumenCostos
            layout="card"
            costoTotal={costoTotal}
            costoUnitario={costoUnitario}
            costoBd={sabor.costo_produccion_unitario}
            pendienteGuardar={pendienteGuardar}
          />
        </div>

        {/* Tablet/desktop: tabla con scroll horizontal de respaldo */}
        <div className="hidden md:block">
          <div className="-mx-px overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={`${thClass} min-w-[12rem]`}>Insumo</th>
                  <th className={`${thClass} w-36 text-right`}>
                    Cant. · Med.
                  </th>
                  <th className={`${thClass} w-28 text-right`}>
                    Costo parcial
                  </th>
                  <th className={`${thClass} w-24 text-center`} />
                </tr>
              </thead>
              <tbody>
                {rowItems.map(({ row, insumo, preparacion, parcial }) => (
                  <tr
                    key={row.key}
                    className="bg-white even:bg-stone-50/60"
                  >
                    <IngredienteRowFields
                      row={row}
                      insumo={insumo}
                      preparacion={preparacion}
                      parcial={parcial}
                      insumos={insumos}
                      preparaciones={preparaciones}
                      soloInsumos={soloInsumos}
                      isPending={isPending}
                      onUpdate={updateRow}
                      onRemove={removeRow}
                      layout="table"
                    />
                  </tr>
                ))}
              </tbody>
              <ResumenCostos
                layout="table"
                costoTotal={costoTotal}
                costoUnitario={costoUnitario}
                costoBd={sabor.costo_produccion_unitario}
                pendienteGuardar={pendienteGuardar}
              />
            </table>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[4.75rem] left-0 right-0 z-40 border-t border-stone-200/90 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgb(0_0_0_/0.08)] backdrop-blur-sm safe-area-pb sm:px-4">
        <div className="app-container w-full">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className={primaryButtonClass}
          >
            {isPending ? 'Guardando…' : 'Guardar receta'}
          </button>
        </div>
      </div>
    </div>
  );
}
