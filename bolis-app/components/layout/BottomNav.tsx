'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChart, IconGear, IconPlus } from '@/components/ui/icons';

const navItems = [
  { href: '/venta', label: 'Venta', Icon: IconPlus },
  { href: '/reportes', label: 'Reportes', Icon: IconChart },
  { href: '/configuracion/productos', label: 'Config', Icon: IconGear },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="no-print fixed bottom-0 left-0 right-0 z-50 border-t-2 border-stone-500 bg-stone-200 shadow-[0_-6px_24px_rgb(0_0_0_/0.18)] safe-area-pb"
    >
      <div className="app-container flex h-[4.25rem] items-center justify-around !px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/configuracion/productos'
              ? pathname.startsWith('/configuracion')
              : item.href === '/reportes'
                ? pathname === '/reportes' || pathname === '/dashboard'
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`) ||
                  pathname === '/registrar';

          const { Icon } = item;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] transition-all ${
                isActive
                  ? 'font-semibold text-brand-dark'
                  : 'font-semibold text-stone-800 hover:text-stone-950'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? 'bg-brand text-white shadow-md shadow-black/25'
                    : 'border border-stone-400 bg-white text-stone-700'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
