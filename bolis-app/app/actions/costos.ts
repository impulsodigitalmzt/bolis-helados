'use server';

import { revalidatePath } from 'next/cache';

/** Refresca pantallas de productos/venta tras recalcular costos (p. ej. al guardar insumos). */
export async function revalidarVistasDeCostos(): Promise<void> {
  revalidatePath('/configuracion/productos');
  revalidatePath('/configuracion/insumos');
  revalidatePath('/configuracion/produccion');
  revalidatePath('/venta');
}
