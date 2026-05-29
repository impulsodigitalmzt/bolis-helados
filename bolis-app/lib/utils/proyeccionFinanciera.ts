import type { ConfigNegocio } from '@/lib/types/database';
import type { UtilidadPeriodo } from '@/lib/queries/finanzas';

export type ModalidadNegocio = 'casa' | 'local';
export type SemaforoFinanciero = 'verde' | 'amarillo' | 'rojo';

export function gastosFijosCasa(config: ConfigNegocio): number {
  return config.costo_oportunidad_casa;
}

export function gastosFijosLocal(config: ConfigNegocio): number {
  return (
    config.renta +
    config.luz +
    config.gas +
    config.internet +
    config.otros_servicios
  );
}

export function gastosFijosActivos(config: ConfigNegocio): number {
  return config.modalidad === 'local'
    ? gastosFijosLocal(config)
    : gastosFijosCasa(config);
}

export interface MargenUnitario {
  precioPromedio: number;
  costoVariableUnitario: number;
  margenContribucion: number;
  comisionUnitaria: number;
}

export function calcularMargenUnitario(
  utilidad: UtilidadPeriodo,
): MargenUnitario | null {
  if (utilidad.bolisVendidos <= 0) return null;

  const precioPromedio = utilidad.ingresos / utilidad.bolisVendidos;
  const costoVariableUnitario = utilidad.costos / utilidad.bolisVendidos;
  const comisionUnitaria = utilidad.comisiones / utilidad.bolisVendidos;

  return {
    precioPromedio,
    costoVariableUnitario,
    margenContribucion: precioPromedio - costoVariableUnitario,
    comisionUnitaria,
  };
}

export function calcularPuntoEquilibrio(
  gastosFijos: number,
  margen: MargenUnitario | null,
): number | null {
  if (!margen || margen.margenContribucion <= 0) return null;
  return Math.ceil(gastosFijos / margen.margenContribucion);
}

export function calcularSemaforo(
  utilidadMes: UtilidadPeriodo,
  gastosFijos: number,
): SemaforoFinanciero {
  const utilidadDespuesFijos = utilidadMes.gananciaNeta - gastosFijos;

  if (utilidadMes.gananciaNeta <= 0) {
    return 'rojo';
  }
  if (utilidadDespuesFijos < 0) {
    return 'amarillo';
  }
  return 'verde';
}

export interface EscenarioFinanciero {
  id: 'actual' | 'local';
  titulo: string;
  descripcion: string;
  modalidadLabel: string;
  gastosFijos: number;
  ingresosMes: number;
  costosProduccionMes: number;
  comisionesMes: number;
  utilidadBrutaMes: number;
  gananciaNetaMes: number;
  utilidadDespuesFijos: number;
  bolisVendidosMes: number;
  precioPromedio: number | null;
  costoVariableUnitario: number | null;
  margenContribucion: number | null;
  puntoEquilibrioBolis: number | null;
  bolisExtraNecesarios: number | null;
}

export function construirEscenarios(
  utilidadMes: UtilidadPeriodo,
  config: ConfigNegocio,
): EscenarioFinanciero[] {
  const margen = calcularMargenUnitario(utilidadMes);
  const gastosActual = gastosFijosActivos(config);
  const gastosLocal = gastosFijosLocal(config);
  const peActual = calcularPuntoEquilibrio(gastosActual, margen);
  const peLocal = calcularPuntoEquilibrio(gastosLocal, margen);

  const base = {
    ingresosMes: utilidadMes.ingresos,
    costosProduccionMes: utilidadMes.costos,
    comisionesMes: utilidadMes.comisiones,
    utilidadBrutaMes: utilidadMes.utilidadBruta,
    gananciaNetaMes: utilidadMes.gananciaNeta,
    bolisVendidosMes: utilidadMes.bolisVendidos,
    precioPromedio: margen?.precioPromedio ?? null,
    costoVariableUnitario: margen?.costoVariableUnitario ?? null,
    margenContribucion: margen?.margenContribucion ?? null,
  };

  return [
    {
      id: 'actual',
      titulo: 'Escenario actual',
      descripcion: 'Con la modalidad y gastos fijos que configuraste',
      modalidadLabel:
        config.modalidad === 'casa' ? 'Modo Casa' : 'Modo Local',
      gastosFijos: gastosActual,
      utilidadDespuesFijos: utilidadMes.gananciaNeta - gastosActual,
      puntoEquilibrioBolis: peActual,
      bolisExtraNecesarios: null,
      ...base,
    },
    {
      id: 'local',
      titulo: 'Escenario local (proyección)',
      descripcion:
        'Si abrieras un local con renta y servicios reales configurados',
      modalidadLabel: 'Modo Local proyectado',
      gastosFijos: gastosLocal,
      utilidadDespuesFijos: utilidadMes.gananciaNeta - gastosLocal,
      puntoEquilibrioBolis: peLocal,
      bolisExtraNecesarios:
        peLocal != null
          ? Math.max(0, peLocal - utilidadMes.bolisVendidos)
          : null,
      ...base,
    },
  ];
}
