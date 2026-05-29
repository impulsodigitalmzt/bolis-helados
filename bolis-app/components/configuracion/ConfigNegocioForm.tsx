'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import {
  fieldInputClass,
  fieldLabelClass,
  primaryButtonClass,
} from '@/components/ui/fieldStyles';
import { guardarConfigNegocio } from '@/lib/queries/configNegocio';
import type { ConfigNegocio, ModalidadNegocio } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/format';
import {
  gastosFijosActivos,
  gastosFijosCasa,
  gastosFijosLocal,
} from '@/lib/utils/proyeccionFinanciera';

interface ConfigNegocioFormProps {
  initialConfig: ConfigNegocio;
}

type Draft = {
  modalidad: ModalidadNegocio;
  costo_oportunidad_casa: string;
  renta: string;
  luz: string;
  gas: string;
  internet: string;
  otros_servicios: string;
};

function toDraft(config: ConfigNegocio): Draft {
  return {
    modalidad: config.modalidad,
    costo_oportunidad_casa: String(config.costo_oportunidad_casa),
    renta: String(config.renta),
    luz: String(config.luz),
    gas: String(config.gas),
    internet: String(config.internet),
    otros_servicios: String(config.otros_servicios),
  };
}

function parseMonto(value: string, label: string): number | null {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < 0) {
    return null;
  }
  return n;
}

export function ConfigNegocioForm({ initialConfig }: ConfigNegocioFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(initialConfig));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewConfig: ConfigNegocio = {
    id: 1,
    modalidad: draft.modalidad,
    costo_oportunidad_casa: parseFloat(draft.costo_oportunidad_casa) || 0,
    renta: parseFloat(draft.renta) || 0,
    luz: parseFloat(draft.luz) || 0,
    gas: parseFloat(draft.gas) || 0,
    internet: parseFloat(draft.internet) || 0,
    otros_servicios: parseFloat(draft.otros_servicios) || 0,
  };

  function handleSave() {
    const costoCasa = parseMonto(
      draft.costo_oportunidad_casa,
      'Costo de oportunidad',
    );
    const renta = parseMonto(draft.renta, 'Renta');
    const luz = parseMonto(draft.luz, 'Luz');
    const gas = parseMonto(draft.gas, 'Gas');
    const internet = parseMonto(draft.internet, 'Internet');
    const otros = parseMonto(draft.otros_servicios, 'Otros servicios');

    if (
      costoCasa === null ||
      renta === null ||
      luz === null ||
      gas === null ||
      internet === null ||
      otros === null
    ) {
      setError('Todos los montos deben ser números válidos (0 o más).');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await guardarConfigNegocio({
          modalidad: draft.modalidad,
          costo_oportunidad_casa: costoCasa,
          renta,
          luz,
          gas,
          internet,
          otros_servicios: otros,
        });
        setSuccessMessage('Configuración de negocio guardada');
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo guardar',
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

      <p className="mb-4 text-xs leading-relaxed text-stone-500">
        Define cómo se calculan tus gastos fijos operativos y el punto de
        equilibrio en Reportes.
      </p>

      <div className="card-premium mb-4 space-y-4 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Modalidad de negocio
        </p>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'casa' as const, label: 'Modo Casa', desc: 'Costo de oportunidad estimado' },
              { id: 'local' as const, label: 'Modo Local', desc: 'Renta y servicios reales' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={isPending}
              onClick={() =>
                setDraft((d) => ({ ...d, modalidad: opt.id }))
              }
              className={`rounded-2xl border-2 px-3 py-3 text-left transition ${
                draft.modalidad === opt.id
                  ? 'border-brand bg-orange-50 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <p className="text-sm font-bold text-stone-900">{opt.label}</p>
              <p className="mt-0.5 text-[10px] text-stone-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {draft.modalidad === 'casa' ? (
        <div className="card-premium mb-4 p-4">
          <label htmlFor="costo-casa" className={fieldLabelClass}>
            Costo de oportunidad estimado (mensual)
          </label>
          <p className="mb-2 text-xs text-stone-500">
            Monto fijo que asignas a la casa por luz, gas y uso del espacio, aunque
            no tengas recibos separados.
          </p>
          <input
            id="costo-casa"
            type="number"
            min={0}
            step="0.01"
            value={draft.costo_oportunidad_casa}
            disabled={isPending}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                costo_oportunidad_casa: e.target.value,
              }))
            }
            className={`${fieldInputClass} tabular-nums`}
          />
        </div>
      ) : (
        <div className="card-premium mb-4 space-y-4 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Gastos fijos del local (mensuales)
          </p>
          {(
            [
              { key: 'renta' as const, label: 'Renta' },
              { key: 'luz' as const, label: 'Luz' },
              { key: 'gas' as const, label: 'Gas' },
              { key: 'internet' as const, label: 'Internet' },
              { key: 'otros_servicios' as const, label: 'Otros servicios' },
            ] as const
          ).map((field) => (
            <div key={field.key}>
              <label className={fieldLabelClass}>{field.label}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft[field.key]}
                disabled={isPending}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                }
                className={`${fieldInputClass} tabular-nums`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="card-premium mb-20 space-y-2 p-4 text-sm">
        <p className="font-bold text-stone-800">Resumen de gastos fijos</p>
        <div className="flex justify-between text-stone-600">
          <span>Modo activo ({draft.modalidad === 'casa' ? 'Casa' : 'Local'})</span>
          <span className="font-bold tabular-nums text-stone-900">
            {formatCurrency(gastosFijosActivos(previewConfig))}
          </span>
        </div>
        <div className="flex justify-between text-stone-500">
          <span>Proyección local (siempre)</span>
          <span className="tabular-nums">
            {formatCurrency(gastosFijosLocal(previewConfig))}
          </span>
        </div>
        {draft.modalidad === 'casa' ? (
          <div className="flex justify-between text-stone-500">
            <span>Costo oportunidad casa</span>
            <span className="tabular-nums">
              {formatCurrency(gastosFijosCasa(previewConfig))}
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="fixed bottom-[4.75rem] left-0 right-0 z-40 border-t border-stone-200/90 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgb(0_0_0_/0.08)] backdrop-blur-sm safe-area-pb">
        <div className="app-container">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className={primaryButtonClass}
          >
            {isPending ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </>
  );
}
