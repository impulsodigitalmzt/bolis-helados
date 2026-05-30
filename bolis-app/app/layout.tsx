import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { InstallPwaHint } from '@/components/pwa/InstallPwaHint';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import {
  APP_LOGO_SIZE,
  APP_LOGO_SRC,
  APP_NAME,
} from '@/lib/branding';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ea580c' },
    { media: '(prefers-color-scheme: dark)', color: '#c2410c' },
  ],
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: APP_NAME,
  description: 'Control financiero de bolis helados artesanales',
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: APP_LOGO_SRC, type: 'image/png' }],
    apple: [{ url: APP_LOGO_SRC, type: 'image/png' }],
    shortcut: [APP_LOGO_SRC],
  },
  openGraph: {
    title: APP_NAME,
    description: 'Control financiero de bolis helados artesanales',
    images: [
      {
        url: APP_LOGO_SRC,
        width: APP_LOGO_SIZE.width,
        height: APP_LOGO_SIZE.height,
        alt: APP_NAME,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <ServiceWorkerRegister />
        {children}
        <InstallPwaHint />
      </body>
    </html>
  );
}
