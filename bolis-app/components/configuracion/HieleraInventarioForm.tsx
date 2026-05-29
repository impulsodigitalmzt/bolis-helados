'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  fieldInputClass,
  fieldLabelClass,
  fieldSelectClass,
  primaryButtonClass,
} from '@/components/ui/fieldStyles';
import {
  cargarHielera,
  getSaboresHieleraPos,
  registrarRetorno,
  type SaborHieleraPos,
} from '@/lib/queries/hielera';

interface HieleraInventarioFormProps {
  sabores: SaborHieleraPos[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HieleraInventarioForm({
  sabores: saboresIniciales,
}: HieleraInventarioFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fecha, setFecha] = useState(todayISO);
  const [sabores, setSabores] = useState(saboresIniciales);
  const [saborCargaId, setSaborCargaId] = useState('');
  const [cantidadCarga, setCantidadCarga] = useState('');
  const [saborRetornoId, setSaborRetornoId] = useState('');
  const [cantidadRetorno, setCantidadRetorno] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setSabores(saboresIniciales);
  }, [saboresIniciales]);

  useEffect(() => {
    let cancelled = false;
    getSaboresHieleraPos(fecha)
      .then((data) => {
        if (!cancelled) setSabores(data);
      })
      .catch(() => {
        /* mantiene lista anterior */
      });
    return () => {
      cancelled = true;
    };
  }, [fecha]);

  const saboresMap = useMemo(
    () => new Map(sabores.map((s) => [s.sabor_id, s])),
    [sabores],
  );

  const saborCarga = saboresMap.get(saborCargaId);
  const saborRetorno = saboresMap.get(saborRetornoId);
  const cantidadCargaNum = Math.max(0, parseInt(cantidadCarga, 10) || 0);
  const cantidadRetornoNum = Math.max(0, parseInt(cantidadRetorno, 10) || 0);

  function handleCargarHielera() {
    setError(null);
    if (!saborCargaId || cantidadCargaNum <= 0) {
      setError('Selecciona un sabor y una cantidad para cargar la hielera.');
      return;
    }
    if (saborCarga && cantidadCargaNum > saborCarga.stock_almacen) {
      setError(
        `Solo hay ${saborCarga.stock_almacen} en almacén para «${saborCarga.sabor_nombre}».`,
      );
      return;
    }

    startTransition(async () => {
      try {
        await cargarHielera({
          fecha,
          lineas: [{ sabor_id: saborCargaId, cantidad: cantidadCargaNum }],
        });
        setCantidadCarga('');
        setSuccessMessage('Hielera cargada correctamente');
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo cargar la hielera',
        );
      }
    });
  }

  function handleRegistrarRetorno() {
    setError(null);
    if (!saborRetornoId || cantidadRetornoNum <= 0) {
      setError('Selecciona un sabor y el sobrante a registrar.');
      return;
    }
    if (saborRetorno && cantidadRetornoNum > saborRetorno.stock_hielera) {
      setError(
        `En hielera solo hay ${saborRetorno.stock_hielera} de «${saborRetorno.sabor_nombre}».`,
      );
      return;
    }

    startTransition(async () => {
      try {
        await registrarRetorno({
          sabor_id: saborRetornoId,
          cantidad_sobrante: cantidadRetornoNum,
          fecha,
        });
        setCantidadRetorno('');
        setSuccessMessage('Sobrante registrado al cierre');
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo registrar el sobrante',
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

      <div className="card-premium mb-4 space-y-3 p-4">
        <label htmlFor="hielera-fecha" className={fieldLabelClass}>
          Fecha del movimiento
        </label>
        <input
          id="hielera-fecha"
          type="date"
          value={fecha}
          disabled={isPending}
          onChange={(e) => setFecha(e.target.value)}
          className={fieldInputClass}
        />
        <p className="text-xs text-stone-500">
          Stock en ventas = Producción − Cargas + Retornos del día.
        </p>
      </div>

      {error ? (
        <div className="alert-warning mb-4">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-premium space-y-3 p-4">
          <h2 className="text-sm font-bold text-stone-900">Cargar hielera</h2>
          <p className="text-xs text-stone-500">
            Traslada bolis del almacén a la hielera para vender en ruta.
          </p>

          <div>
            <label htmlFor="hielera-carga-sabor" className={fieldLabelClass}>
              Sabor
            </label>
            <select
              id="hielera-carga-sabor"
              value={saborCargaId}
              disabled={isPending || sabores.length === 0}
              onChange={(e) => setSaborCargaId(e.target.value)}
              className={fieldSelectClass}
            >
              <option value="">Selecciona…</option>
              {sabores.map((s) => (
                <option key={s.sabor_id} value={s.sabor_id}>
                  {s.sabor_nombre} (almacén: {s.stock_almacen})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="hielera-carga-cantidad" className={fieldLabelClass}>
              Cantidad a cargar
            </label>
            <input
              id="hielera-carga-cantidad"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={cantidadCarga}
              disabled={isPending}
              onChange={(e) => setCantidadCarga(e.target.value)}
              className={`${fieldInputClass} tabular-nums`}
            />
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleCargarHielera}
            className={primaryButtonClass}
          >
            {isPending ? 'Guardando…' : 'Cargar hielera'}
          </button>
        </section>

        <section className="card-premium space-y-3 p-4">
          <h2 className="text-sm font-bold text-stone-900">
            Registrar sobrantes al cierre
          </h2>
          <p className="text-xs text-stone-500">
            Devuelve a almacén lo que sobró en la hielera al terminar la jornada.
          </p>

          <div>
            <label htmlFor="hielera-retorno-sabor" className={fieldLabelClass}>
              Sabor
            </label>
            <select
              id="hielera-retorno-sabor"
              value={saborRetornoId}
              disabled={isPending || sabores.length === 0}
              onChange={(e) => setSaborRetornoId(e.target.value)}
              className={fieldSelectClass}
            >
              <option value="">Selecciona…</option>
              {sabores.map((s) => (
                <option key={s.sabor_id} value={s.sabor_id}>
                  {s.sabor_nombre} (en hielera: {s.stock_hielera})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="hielera-retorno-cantidad"
              className={fieldLabelClass}
            >
              Cantidad sobrante
            </label>
            <input
              id="hielera-retorno-cantidad"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={cantidadRetorno}
              disabled={isPending}
              onChange={(e) => setCantidadRetorno(e.target.value)}
              className={`${fieldInputClass} tabular-nums`}
            />
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleRegistrarRetorno}
            className={primaryButtonClass}
          >
            {isPending ? 'Guardando…' : 'Registrar sobrante'}
          </button>
        </section>
      </div>
    </>
  );
}
