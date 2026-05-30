'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';
import { ConfigNavToolbar } from '@/components/configuracion/ConfigNavToolbar';
import { SectionTabNav } from '@/components/ui/SectionTabNav';
import {
  SECTION_FIXED_HEADER_CLASS,
} from '@/lib/sectionChrome';
import {
  IconGear,
  IconIceCream,
  IconPackage,
  IconPlus,
} from '@/components/ui/icons';

const CONFIG_TABS = [
  {
    key: 'productos',
    href: '/configuracion/productos',
    label: 'Productos',
    hint: 'Recetas, precios de venta y costos por boli',
    Icon: IconIceCream,
  },
  {
    key: 'insumos',
    href: '/configuracion/insumos',
    label: 'Insumos',
    hint: 'Precios y tamaño de paquete de materia prima',
    Icon: IconPackage,
  },
  {
    key: 'produccion',
    href: '/configuracion/produccion',
    label: 'Producción',
    hint: 'Registrar lotes fabricados y stock',
    Icon: IconPlus,
  },
  {
    key: 'hielera',
    href: '/configuracion/hielera',
    label: 'Hielera',
    hint: 'Carga diaria y sobrantes al cierre de jornada',
    Icon: IconPackage,
  },
  {
    key: 'negocio',
    href: '/configuracion/negocio',
    label: 'Negocio',
    hint: 'Gastos fijos y modalidad del negocio',
    Icon: IconGear,
  },
] as const;

export function ConfigSubNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  const activeIndex = useMemo(() => {
    const idx = CONFIG_TABS.findIndex(
      (tab) =>
        pathname === tab.href || pathname.startsWith(`${tab.href}/`),
    );
    return idx >= 0 ? idx : 0;
  }, [pathname]);

  const canGoBack = activeIndex > 0;
  const canGoForward = activeIndex < CONFIG_TABS.length - 1;

  const handleRestore = useCallback(() => {
    startRefresh(() => {
      router.refresh();
    });
  }, [router]);

  return (
    <div className={SECTION_FIXED_HEADER_CLASS}>
      <SectionTabNav
        items={[...CONFIG_TABS]}
        pathname={pathname}
        ariaLabel="Sección de configuración"
        variant="card"
        equalColumns
        pinned
          showHint
          showHintText={false}
          hintActions={
          <ConfigNavToolbar
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            isRefreshing={isRefreshing}
            onBack={() => {
              if (canGoBack) router.push(CONFIG_TABS[activeIndex - 1].href);
            }}
            onForward={() => {
              if (canGoForward) router.push(CONFIG_TABS[activeIndex + 1].href);
            }}
            onRestore={handleRestore}
            onPrint={() => window.print()}
          />
        }
      />
    </div>
  );
}
