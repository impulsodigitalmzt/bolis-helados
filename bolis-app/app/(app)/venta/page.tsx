import { PosVenta } from '@/components/ventas/PosVenta';
import { getSaboresParaPos, getVendedoras } from '@/lib/queries/ventas';

export default async function VentaPage() {
  let sabores: Awaited<ReturnType<typeof getSaboresParaPos>> = [];
  let vendedoras: Awaited<ReturnType<typeof getVendedoras>> = [];
  let errorMessage: string | null = null;

  try {
    [sabores, vendedoras] = await Promise.all([
      getSaboresParaPos(),
      getVendedoras(),
    ]);
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : 'No se pudo conectar con Supabase';
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col lg:max-w-lg">
      {errorMessage ? (
        <div className="alert-warning mb-4 shrink-0">{errorMessage}</div>
      ) : null}

      {sabores.length === 0 ? (
        <p className="card-premium mb-4 shrink-0 p-4 text-sm text-stone-600">
          Registra producción en Config → Producción para tener bolis en
          inventario antes de vender.
        </p>
      ) : null}

      <PosVenta sabores={sabores} vendedoras={vendedoras} />
    </div>
  );
}
