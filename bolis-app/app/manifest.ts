import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Bolis & Más',
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
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
