import { supabase } from '@/lib/supabaseClient';
import type { ConfigNegocio } from '@/lib/types/database';
import { assertNoError } from './errors';

const CONFIG_ID = 1;

export const CONFIG_NEGOCIO_DEFAULT: ConfigNegocio = {
  id: CONFIG_ID,
  modalidad: 'casa',
  costo_oportunidad_casa: 0,
  renta: 0,
  luz: 0,
  gas: 0,
  internet: 0,
  otros_servicios: 0,
};

function normalizeConfig(row: ConfigNegocio): ConfigNegocio {
  return {
    ...row,
    modalidad: row.modalidad === 'local' ? 'local' : 'casa',
    costo_oportunidad_casa: Number(row.costo_oportunidad_casa) || 0,
    renta: Number(row.renta) || 0,
    luz: Number(row.luz) || 0,
    gas: Number(row.gas) || 0,
    internet: Number(row.internet) || 0,
    otros_servicios: Number(row.otros_servicios) || 0,
  };
}

export async function getConfigNegocio(): Promise<ConfigNegocio> {
  const { data, error } = await supabase
    .from('config_negocio')
    .select('*')
    .eq('id', CONFIG_ID)
    .maybeSingle();

  if (error?.code === 'PGRST205' || error?.message?.includes('config_negocio')) {
    return CONFIG_NEGOCIO_DEFAULT;
  }

  assertNoError(error, 'Error al cargar configuración de negocio');
  return data ? normalizeConfig(data as ConfigNegocio) : CONFIG_NEGOCIO_DEFAULT;
}

export type ConfigNegocioInput = Omit<ConfigNegocio, 'id' | 'updated_at'>;

export async function guardarConfigNegocio(
  input: ConfigNegocioInput,
): Promise<ConfigNegocio> {
  const payload = {
    id: CONFIG_ID,
    modalidad: input.modalidad,
    costo_oportunidad_casa: input.costo_oportunidad_casa,
    renta: input.renta,
    luz: input.luz,
    gas: input.gas,
    internet: input.internet,
    otros_servicios: input.otros_servicios,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('config_negocio')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error?.code === 'PGRST205' || error?.message?.includes('config_negocio')) {
    throw new Error(
      'Ejecuta la migración 006_config_modalidad_negocio.sql en Supabase',
    );
  }

  assertNoError(error, 'Error al guardar configuración de negocio');
  return normalizeConfig(data as ConfigNegocio);
}
