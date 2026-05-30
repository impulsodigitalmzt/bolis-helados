import type { MetadataRoute } from 'next';
import { APP_NAME } from '@/lib/branding';

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
        src: '/apple-icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
