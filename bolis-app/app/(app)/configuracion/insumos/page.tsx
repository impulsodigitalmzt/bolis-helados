import { InsumosConfigList } from '@/components/configuracion/InsumosConfigList';
import { getInsumosConMeta } from '@/lib/queries/insumos';

export default async function InsumosConfigPage() {
  let insumos: Awaited<ReturnType<typeof getInsumosConMeta>>['insumos'] = [];
  let duplicadosEnBd = 0;
  let errorMessage: string | null = null;

  try {
    const meta = await getInsumosConMeta();
    insumos = meta.insumos;
    duplicadosEnBd = meta.duplicadosEnBd;
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : 'No se pudo cargar los insumos';
  }

  return (
    <>
      {errorMessage ? (
        <div className="alert-warning mb-4">{errorMessage}</div>
      ) : null}
      {duplicadosEnBd > 0 ? (
        <div className="alert-warning mb-4 text-sm">
          Hay {duplicadosEnBd} insumo(s) repetido(s) en la base de datos. La app
          muestra solo uno por nombre. Para borrar los sobrantes en Supabase,
          ejecuta:{' '}
          <code className="text-xs">SELECT * FROM limpiar_insumos_duplicados();</code>{' '}
          (migración 008_limpiar_insumos_duplicados.sql).
        </div>
      ) : null}
      <InsumosConfigList initialInsumos={insumos} />
    </>
  );
}
