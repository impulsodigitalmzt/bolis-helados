import type { MetadataRoute } from 'next';
import { APP_LOGO_SIZE, APP_LOGO_SRC, APP_NAME } from '@/lib/branding';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: APP_NAME,
    short_name: 'Bolis',
    description: 'Control financiero de bolis helados artesanales',
    start_url: '/venta',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#c9c5c0',
    theme_color: '#ea580c',
    lang: 'es',
    categories: ['business', 'finance'],
    icons: [
      {
        src: APP_LOGO_SRC,
        sizes: `${APP_LOGO_SIZE.width}x${APP_LOGO_SIZE.height}`,
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: APP_LOGO_SRC,
        sizes: `${APP_LOGO_SIZE.width}x${APP_LOGO_SIZE.height}`,
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
