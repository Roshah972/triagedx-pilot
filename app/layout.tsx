import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthGuard from '@/components/AuthGuard'
import TourProviderWrapper from '@/components/TourProviderWrapper'

export const metadata: Metadata = {
  title: 'TRIAGEDX - ER Walk-In Intake & Triage',
  description: 'Emergency Department intake and triage accelerator',
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover', // Support for iOS safe areas
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#5833ff' },
    { media: '(prefers-color-scheme: dark)', color: '#6B46FF' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TourProviderWrapper>
          <AuthGuard>{children}</AuthGuard>
        </TourProviderWrapper>
      </body>
    </html>
  )
}

