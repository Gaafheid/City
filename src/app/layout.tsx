import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';
import SWRegister from '@/components/SWRegister';

export const metadata: Metadata = {
  title: 'View the Town',
  description: 'Type a city. Get 8 must-see highlights. Walk around — get the story when you arrive.',
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
