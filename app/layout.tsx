import type { Metadata, Viewport } from 'next';
import { Fraunces, Nunito } from 'next/font/google';
import { AppProviders } from '@/components/providers/AppProviders';
import { getCapabilities } from '@/lib/server/config';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Spanish with Emma', template: '%s · Spanish with Emma' },
  description: 'Learn Spanish by talking with Emma — from your very first ¡Hola! to real spoken conversations.',
  applicationName: 'Spanish with Emma',
  appleWebApp: { capable: true, title: 'Emma', statusBarStyle: 'default' },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fbf3e8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const capabilities = getCapabilities();
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable}`}>
      <body>
        <AppProviders capabilities={capabilities}>{children}</AppProviders>
      </body>
    </html>
  );
}
