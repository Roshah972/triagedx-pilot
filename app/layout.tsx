import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthGuard from '@/components/AuthGuard'

export const metadata: Metadata = {
  title: 'TRIAGEDX - ER Walk-In Intake & Triage',
  description: 'Emergency Department intake and triage accelerator',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TRIAGEDX',
  },
  formatDetection: {
    telephone: false,
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
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}

