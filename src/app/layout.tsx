import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { InstallPrompt } from '@/components/layout/InstallPrompt';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StoreSync',
  description: 'Inventory & sales management for your business',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StoreSync',
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} h-full bg-gray-50 antialiased`}>
        <AuthProvider>
          <OfflineBanner />
          {children}
          <InstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
