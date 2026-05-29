import { ProduccionForm } from '@/components/produccion/ProduccionForm';
import {
  getHistorialProduccionReciente,
} from '@/lib/queries/produccion';
import { getSabores } from '@/lib/queries/sabores';

export default async function ProduccionPage() {
  let sabores: Awaited<ReturnType<typeof getSabores>> = [];
  let historial: Awaited<ReturnType<typeof getHistorialProduccionReciente>> =
    [];
  let errorMessage: string | null = null;

  try {
    sabores = await getSabores();
  } catch (err) {
    errorMessage =
      err instanceof Error
        ? err.message
        : 'No se pudo cargar la página de producción';
  }

  try {
    historial = await getHistorialProduccionReciente(8);
  } catch {
    historial = [];
  }

  return (
    <>
      {errorMessage ? (
        <div className="alert-warning mb-4">{errorMessage}</div>
      ) : null}

      {sabores.length === 0 ? (
        <p className="card-premium mb-4 p-4 text-sm text-stone-600">
          Carga sabores en Supabase y configura sus recetas antes de registrar
          producción.
        </p>
      ) : null}

      <ProduccionForm
        sabores={sabores.filter((s) => !s.es_preparacion)}
        historialReciente={historial}
      />
    </>
  );
}
