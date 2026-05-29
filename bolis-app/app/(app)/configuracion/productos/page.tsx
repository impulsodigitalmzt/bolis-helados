import { SaboresProductosList } from '@/components/configuracion/SaboresProductosList';
import { getSabores } from '@/lib/queries/sabores';

export default async function ProductosConfigPage() {
  let sabores: Awaited<ReturnType<typeof getSabores>> = [];
  let errorMessage: string | null = null;

  try {
    sabores = await getSabores();
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : 'No se puede cargar los productos';
  }

  return (
    <>
      {errorMessage ? (
        <div className="alert-warning mb-4">{errorMessage}</div>
      ) : null}
      <SaboresProductosList initialSabores={sabores} />
    </>
  );
}
