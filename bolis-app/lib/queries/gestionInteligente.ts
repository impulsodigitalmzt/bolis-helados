import { supabase } from '@/lib/supabaseClient';
import type {
  HistorialPrecioInsumo,
  LogSistema,
  SugerenciaCompra,
} from '@/lib/types/database';
import { assertNoError } from './errors';

export interface AlertasYComprasData {
  sugerencias: SugerenciaCompra[];
  proximosAgotarse: SugerenciaCompra[];
  sugerenciaCompra: SugerenciaCompra[];
  logsRecientes: LogSistema[];
}

export async function getSugerenciasCompra(
  diasAnalisis = 30,
  diasProyeccion = 7,
): Promise<SugerenciaCompra[]> {
  const { data, error } = await supabase.rpc('calcular_sugerencia_compra', {
    p_dias_analisis: diasAnalisis,
    p_dias_proyeccion: diasProyeccion,
  });

  if (
    error?.code === 'PGRST202' ||
    error?.message?.includes('calcular_sugerencia_compra')
  ) {
    throw new Error(
      'Ejecuta la migración 007_gestion_inteligente.sql en Supabase',
    );
  }

  assertNoError(error, 'Error al calcular sugerencias de compra');
  return (data ?? []) as SugerenciaCompra[];
}

export async function getLogsRecientes(limit = 15): Promise<LogSistema[]> {
  const { data, error } = await supabase
    .from('logs_sistema')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error?.code === 'PGRST205' || error?.message?.includes('logs_sistema')) {
    return [];
  }

  assertNoError(error, 'Error al cargar el log del sistema');
  return (data ?? []) as LogSistema[];
}

export async function getHistorialPreciosInsumo(
  insumoId: string,
  limit = 10,
): Promise<HistorialPrecioInsumo[]> {
  const { data, error } = await supabase
    .from('historial_precios_insumos')
    .select('*')
    .eq('insumo_id', insumoId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error?.code === 'PGRST205') return [];
  assertNoError(error, 'Error al cargar historial de precios');
  return (data ?? []) as HistorialPrecioInsumo[];
}

export async function getAlertasYCompras(): Promise<AlertasYComprasData> {
  const [sugerencias, logsRecientes] = await Promise.all([
    getSugerenciasCompra(),
    getLogsRecientes(12),
  ]);

  const proximosAgotarse = sugerencias.filter(
    (s) => s.urgencia === 'critico' || s.urgencia === 'alerta',
  );

  const sugerenciaCompra = sugerencias.filter(
    (s) => s.cantidad_sugerida > 0 && s.urgencia !== 'sin_ritmo',
  );

  return {
    sugerencias,
    proximosAgotarse,
    sugerenciaCompra,
    logsRecientes,
  };
}

export async function registrarCompraInsumo(input: {
  insumo_id: string;
  precio_nuevo: number;
  cantidad_agregada?: number;
  notas?: string;
  usuario?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_compra_insumo', {
    p_insumo_id: input.insumo_id,
    p_precio_nuevo: input.precio_nuevo,
    p_cantidad_agregada: input.cantidad_agregada ?? 0,
    p_notas: input.notas ?? null,
    p_usuario: input.usuario ?? 'app',
  });

  if (
    error?.code === 'PGRST202' ||
    error?.message?.includes('registrar_compra_insumo')
  ) {
    throw new Error(
      'Ejecuta la migración 007_gestion_inteligente.sql en Supabase',
    );
  }

  assertNoError(error, 'Error al registrar la compra');
  return data as string;
}
