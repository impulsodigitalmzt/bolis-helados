import { HieleraInventarioForm } from '@/components/configuracion/HieleraInventarioForm';
import { getSaboresHieleraPos } from '@/lib/queries/hielera';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function HieleraConfigPage() {
  let sabores: Awaited<ReturnType<typeof getSaboresHieleraPos>> = [];
  let errorMessage: string | null = null;

  try {
    sabores = await getSaboresHieleraPos(todayISO());
  } catch (err) {
    errorMessage =
      err instanceof Error
        ? err.message
        : 'No se pudo cargar el inventario de hielera';
  }

  return (
    <>
      {errorMessage ? (
        <div className="alert-warning mb-4">{errorMessage}</div>
      ) : null}

      {sabores.length === 0 ? (
        <p className="card-premium mb-4 p-4 text-sm text-stone-600">
          Registra producción antes de cargar la hielera.
        </p>
      ) : null}

      <HieleraInventarioForm sabores={sabores} />
    </>
  );
}
