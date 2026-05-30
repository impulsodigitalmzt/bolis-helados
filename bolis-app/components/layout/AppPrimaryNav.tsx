'use client';

import { usePathname } from 'next/navigation';
import { SectionTabNav } from '@/components/ui/SectionTabNav';
import { IconChart, IconGear, IconPlus } from '@/components/ui/icons';

const PRIMARY_TABS = [
  {
    key: 'venta',
    href: '/venta',
    label: 'Venta',
    hint: 'Registrar ventas del día',
    Icon: IconPlus,
    alsoActiveOn: ['/registrar'],
  },
  {
    key: 'reportes',
    href: '/reportes',
    label: 'Reportes',
    hint: 'Finanzas, inventario y ventas',
    Icon: IconChart,
    alsoActiveOn: ['/dashboard'],
  },
  {
    key: 'config',
    href: '/configuracion/productos',
    label: 'Config',
    hint: 'Productos, insumos y negocio',
    Icon: IconGear,
  },
] as const;

export function AppPrimaryNav() {
  const pathname = usePathname();

  return (
    <SectionTabNav
      items={[...PRIMARY_TABS]}
      pathname={pathname}
      ariaLabel="Navegación principal"
      variant="card"
      equalColumns
      pinned
      showHint={false}
    />
  );
}
