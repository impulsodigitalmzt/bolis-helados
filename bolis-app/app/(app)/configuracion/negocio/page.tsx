import { ConfigNegocioForm } from '@/components/configuracion/ConfigNegocioForm';
import {
  CONFIG_NEGOCIO_DEFAULT,
  getConfigNegocio,
} from '@/lib/queries/configNegocio';

export default async function ConfigNegocioPage() {
  let config = CONFIG_NEGOCIO_DEFAULT;
  let errorMessage: string | null = null;

  try {
    config = await getConfigNegocio();
  } catch (err) {
    errorMessage =
      err instanceof Error
        ? err.message
        : 'No se pudo cargar la configuración';
  }

  return (
    <>
      {errorMessage ? (
        <div className="alert-warning mb-4">{errorMessage}</div>
      ) : null}
      <ConfigNegocioForm initialConfig={config} />
    </>
  );
}
