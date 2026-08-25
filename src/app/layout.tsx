import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ENGRAM',
    template: '%s · ENGRAM',
  },
  description:
    'ENGRAM — a premium local-first note-taking PWA. Rich notes, wikilinks, graph view and writing stats, all stored on your own device.',
  applicationName: 'ENGRAM',
  manifest: '/manifest.webmanifest',
  keywords: ['notes', 'local-first', 'PWA', 'markdown', 'second brain'],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ENGRAM',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0e14',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
