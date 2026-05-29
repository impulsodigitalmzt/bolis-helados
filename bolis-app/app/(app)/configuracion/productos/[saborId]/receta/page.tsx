import { notFound } from 'next/navigation';
import { RecetaEditor } from '@/components/configuracion/RecetaEditor';
import { getInsumos } from '@/lib/queries/insumos';
import { getRecetasBySabor } from '@/lib/queries/recetas';
import { getPreparaciones, getSaborById } from '@/lib/queries/sabores';

interface PageProps {
  params: Promise<{ saborId: string }>;
}

export default async function RecetaPage({ params }: PageProps) {
  const { saborId } = await params;

  let sabor = null;
  let lineas: Awaited<ReturnType<typeof getRecetasBySabor>> = [];
  let insumos: Awaited<ReturnType<typeof getInsumos>> = [];
  let preparaciones: Awaited<ReturnType<typeof getPreparaciones>> = [];
  let errorMessage: string | null = null;

  try {
    const [s, r, i, p] = await Promise.all([
      getSaborById(saborId),
      getRecetasBySabor(saborId),
      getInsumos(),
      getPreparaciones(),
    ]);
    sabor = s;
    lineas = r;
    insumos = i;
    preparaciones = p;
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : 'No se pudo cargar la receta';
  }

  if (!sabor && !errorMessage) {
    notFound();
  }

  if (!sabor) {
    return (
      <div className="alert-warning">
        {errorMessage ?? 'Sabor no encontrado'}
      </div>
    );
  }

  return (
    <>
      {errorMessage ? (
        <div className="alert-warning mb-4">{errorMessage}</div>
      ) : null}
      <RecetaEditor
        sabor={sabor}
        lineas={lineas}
        insumos={insumos}
        preparaciones={preparaciones}
      />
    </>
  );
}
