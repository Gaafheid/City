import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import SWRegister from '@/components/SWRegister';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'City Highlights',
  description: 'Discover and navigate city highlights on your holiday.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Highlights',
  },
  other: {
    'apple-touch-icon': '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="h-full font-sans antialiased">
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
