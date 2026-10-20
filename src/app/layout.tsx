import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';
import SWRegister from '@/components/SWRegister';

export const metadata: Metadata = {
  metadataBase: new URL('https://viewthetown.com'),
  title: {
    default: 'View the Town — Explore cities through their stories',
    template: '%s | View the Town',
  },
  description: 'Discover a city through its essential places and the stories behind them. Plan a walk, then explore at your own pace.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: 'https://viewthetown.com',
    siteName: 'View the Town',
    title: 'View the Town — Explore cities through their stories',
    description: 'Discover a city through its essential places and the stories behind them.',
  },
  twitter: {
    card: 'summary',
    title: 'View the Town — Explore cities through their stories',
    description: 'Discover a city through its essential places and the stories behind them.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'View the Town',
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
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-9HGYH8F5KL"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-9HGYH8F5KL');`}
        </Script>
      </head>
      <body className="h-full antialiased">
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
