import type { Metadata, Viewport } from 'next/types';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nett — Know what you actually have',
  description: 'A calm financial operating system for multi-currency life.',
  applicationName: 'Nett',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/nett-lotus-192.png',
    apple: '/icons/nett-lotus-180.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Nett' },
};

export const viewport: Viewport = {
  themeColor: '#f4f4f6',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
