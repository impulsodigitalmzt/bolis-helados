import { redirect } from 'next/navigation';

/** Resumen legado — los gráficos viven en /reportes */
export default function DashboardPage() {
  redirect('/reportes');
}
