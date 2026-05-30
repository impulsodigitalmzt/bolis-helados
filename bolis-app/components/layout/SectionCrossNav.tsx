'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChart, IconGear, IconPlus } from '@/components/ui/icons';

const navBtnClass =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-stone-400 bg-white text-stone-700 transition hover:border-brand hover:text-brand-dark';

const LINKS = {
  venta: { href: '/venta', label: 'Venta', Icon: IconPlus },
  reportes: { href: '/reportes', label: 'Reportes', Icon: IconChart },
  config: {
    href: '/configuracion/productos',
    label: 'Config',
    Icon: IconGear,
  },
} as const;

type CrossNavKey = keyof typeof LINKS;

interface SectionCrossNavProps {
  /** Secciones a mostrar como acceso rápido. */
  items: readonly CrossNavKey[];
}

export function SectionCrossNav({ items }: SectionCrossNavProps) {
  const pathname = usePathname();

  return (
    <>
      {items.map((key) => {
        const { href, label, Icon } = LINKS[key];
        const isActive =
          key === 'config'
            ? pathname.startsWith('/configuracion')
            : key === 'reportes'
              ? pathname === '/reportes' || pathname === '/dashboard'
              : pathname === href || pathname === '/registrar';

        if (isActive) return null;

        return (
          <Link
            key={key}
            href={href}
            className={navBtnClass}
            aria-label={label}
            title={label}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </Link>
        );
      })}
    </>
  );
}
