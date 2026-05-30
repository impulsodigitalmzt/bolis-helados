'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { Card } from '@/components/ui/Card';
import { IconPackage } from '@/components/ui/icons';
import {
  compactInputClass,
  fieldInputClass,
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui/fieldStyles';
import {
  getAlertasYCompras,
  registrarCompraInsumo,
  type AlertasYComprasData,
} from '@/lib/queries/gestionInteligente';
import type { SugerenciaCompra, UrgenciaSugerencia } from '@/lib/types/database';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface AlertasYComprasProps {
  initialData: AlertasYComprasData;
  embedded?: boolean;
}

const URGENCIA_STYLES: Record<
  UrgenciaSugerencia,
  { label: string; badge: string }
> = {
  critico: { label: 'Crítico', badge: 'bg-red-600 text-white' },
  alerta: { label: 'Alerta', badge: 'bg-amber-500 text-white' },
  ok: { label: 'OK', badge: 'bg-stone-300 text-stone-700' },
  sin_ritmo: { label: 'Sin ritmo', badge: 'bg-stone-200 text-stone-600' },
};

function formatQty(value: number, unidad: string): string {
  const n = Number(value);
  const formatted =
    n % 1 === 0 ? formatNumber(n) : n.toFixed(3).replace(/\.?0+$/, '');
  return `${formatted} ${unidad}`;
}

function formatLogFecha(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SugerenciaRow({ item }: { item: SugerenciaCompra }) {
  const u = URGENCIA_STYLES[item.urgencia];
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 px-3 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="font-semibold text-stone-900">{item.insumo_nombre}</p>
        <p className="text-[10px] text-stone-500">
          Consumo ~{formatQty(item.consumo_diario_promedio, item.unidad)}/día · 7d:{' '}
          {formatQty(item.consumo_proyectado, item.unidad)}
        </p>
      </div>
      <div className="text-right">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${u.badge}`}
        >
          {u.label}
        </span>
        <p className="mt-1 text-xs tabular-nums text-stone-600">
          Stock: {formatQty(item.stock_actual, item.unidad)}
        </p>
        {item.cantidad_sugerida > 0 ? (
          <p className="text-xs font-bold tabular-nums text-brand-dark">
            Comprar: {formatQty(item.cantidad_sugerida, item.unidad)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function AlertasYCompras({ initialData, embedded = false }: AlertasYComprasProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [compraInsumoId, setCompraInsumoId] = useState('');
  const [compraPrecio, setCompraPrecio] = useState('');
  const [compraCantidad, setCompraCantidad] = useState('');
  const [compraNotas, setCompraNotas] = useState('');

  const insumoSeleccionado = data.sugerencias.find(
    (s) => s.insumo_id === compraInsumoId,
  );

  function refresh() {
    startTransition(async () => {
      try {
        const next = await getAlertasYCompras();
        setData(next);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudieron actualizar alertas',
        );
      }
    });
  }

  function handleRegistrarCompra() {
    const precio = parseFloat(compraPrecio);
    const cantidad = parseFloat(compraCantidad) || 0;

    if (!compraInsumoId) {
      setError('Selecciona un insumo.');
      return;
    }
    if (Number.isNaN(precio) || precio < 0) {
      setError('Precio inválido.');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await registrarCompraInsumo({
          insumo_id: compraInsumoId,
          precio_nuevo: precio,
          cantidad_agregada: cantidad,
          notas: compraNotas.trim() || undefined,
        });
        setSuccessMessage(
          `Compra registrada · recetas recalculadas con precio ${formatCurrency(precio)}`,
        );
        setCompraInsumoId('');
        setCompraPrecio('');
        setCompraCantidad('');
        setCompraNotas('');
        refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo registrar la compra',
        );
      }
    });
  }

  return (
    <section className={`min-w-0 max-w-full space-y-4 ${isPending ? 'opacity-70' : ''}`}>
      {successMessage ? (
        <SuccessToast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-2">
        {embedded ? (
          <p className="min-w-0 flex-1 text-xs font-medium text-stone-700">
            Proyección a 7 días según producción reciente
          </p>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <IconPackage className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-stone-900">
                Alertas y compras
              </h2>
              <p className="text-xs font-medium text-stone-700">
                Proyección 7 días según producción de los últimos 30 días
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className={`${secondaryButtonClass} shrink-0 text-xs`}
        >
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden !p-0">
        <div className="border-b border-stone-100 bg-red-50/80 px-3 py-2">
          <p className="text-sm font-bold text-red-900">
            Insumos próximos a agotarse
          </p>
          <p className="text-[10px] text-red-700">
            Stock proyectado menor al consumo de la próxima semana
          </p>
        </div>
        {data.proximosAgotarse.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">
            Sin alertas críticas. Inventario suficiente para el ritmo actual.
          </p>
        ) : (
          <ul>
            {data.proximosAgotarse.map((item) => (
              <SugerenciaRow key={item.insumo_id} item={item} />
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden !p-0">
        <div className="border-b border-stone-100 bg-orange-50 px-3 py-2">
          <p className="text-sm font-bold text-stone-900">
            Sugerencia de compra
          </p>
          <p className="text-[10px] text-stone-600">
            Cantidad recomendada para cubrir 7 días de producción al ritmo actual
          </p>
        </div>
        {data.sugerenciaCompra.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">
            No hay compras sugeridas por ahora.
          </p>
        ) : (
          <ul>
            {data.sugerenciaCompra.map((item) => (
              <SugerenciaRow key={`sug-${item.insumo_id}`} item={item} />
            ))}
          </ul>
        )}
      </Card>
      </div>

      <div className="card-premium space-y-3 p-4 lg:max-w-xl">
        <p className="text-sm font-bold text-stone-800">
          Registrar compra de insumo
        </p>
        <p className="text-xs text-stone-500">
          Actualiza precio de mercado, suma stock y recalcula costos de todas las
          recetas que usan este insumo.
        </p>

        <div>
          <label className={fieldLabelClass}>Insumo</label>
          <select
            value={compraInsumoId}
            disabled={isPending}
            onChange={(e) => {
              const id = e.target.value;
              setCompraInsumoId(id);
              const ins = data.sugerencias.find((s) => s.insumo_id === id);
              if (ins) setCompraCantidad(String(ins.cantidad_sugerida || ''));
            }}
            className={fieldInputClass}
          >
            <option value="">Seleccionar…</option>
            {data.sugerencias.map((s) => (
              <option key={s.insumo_id} value={s.insumo_id}>
                {s.insumo_nombre}
                {s.cantidad_sugerida > 0
                  ? ` · sugerido ${formatQty(s.cantidad_sugerida, s.unidad)}`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabelClass}>Precio unitario nuevo</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={compraPrecio}
              disabled={isPending}
              onChange={(e) => setCompraPrecio(e.target.value)}
              className={`${compactInputClass} tabular-nums`}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Cantidad comprada</label>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={compraCantidad}
              disabled={isPending}
              onChange={(e) => setCompraCantidad(e.target.value)}
              className={`${compactInputClass} tabular-nums`}
              placeholder={
                insumoSeleccionado
                  ? formatQty(
                      insumoSeleccionado.cantidad_sugerida,
                      insumoSeleccionado.unidad,
                    )
                  : '0'
              }
            />
          </div>
        </div>

        <div>
          <label className={fieldLabelClass}>Notas (opcional)</label>
          <input
            type="text"
            value={compraNotas}
            disabled={isPending}
            onChange={(e) => setCompraNotas(e.target.value)}
            className={compactInputClass}
            placeholder="Ej. Compra Oxxo / mayoreo"
          />
        </div>

        <button
          type="button"
          disabled={isPending || !compraInsumoId}
          onClick={handleRegistrarCompra}
          className={primaryButtonClass}
        >
          {isPending ? 'Registrando…' : 'Registrar compra y actualizar costos'}
        </button>
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="border-b border-stone-100 bg-stone-50 px-3 py-2">
          <p className="text-sm font-bold text-stone-800">
            Log de auditoría
          </p>
          <p className="text-[10px] text-stone-500">
            Cambios en inventario, recetas y configuración
          </p>
        </div>
        {data.logsRecientes.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">
            Sin eventos registrados. Ejecuta la migración 007 si acabas de
            instalar esta función.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {data.logsRecientes.map((log) => (
              <li key={log.id} className="px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 break-words text-sm font-medium text-stone-900">
                    {log.descripcion}
                  </p>
                  <span className="shrink-0 text-[10px] text-stone-400">
                    {formatLogFecha(log.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-stone-500">
                  {log.tipo_accion} · {log.entidad} · {log.usuario}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
