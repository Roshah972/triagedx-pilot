'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Don't guard the login page itself
    if (pathname === '/login') {
      setIsAuthenticated(true)
      return
    }

    // Check authentication
    const checkAuth = () => {
      if (typeof window === 'undefined') {
        return false
      }

      const authed = localStorage.getItem('triagedx_pilot_authed') === '1'
      
      if (authed) {
        // Optional: Check if session is too old (e.g., 24 hours)
        const authedAt = localStorage.getItem('triagedx_pilot_authed_at')
        if (authedAt) {
          const hoursSinceAuth = (Date.now() - parseInt(authedAt)) / (1000 * 60 * 60)
          // Session expires after 24 hours
          if (hoursSinceAuth > 24) {
            localStorage.removeItem('triagedx_pilot_authed')
            localStorage.removeItem('triagedx_pilot_authed_at')
            return false
          }
        }
      }

      return authed
    }

    const authed = checkAuth()
    setIsAuthenticated(authed)

    if (!authed && pathname !== '/login') {
      router.replace('/login')
    }
  }, [pathname, router])

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--color-cloud)',
            borderTop: '4px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'auth-spinner-spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
            Loading...
          </p>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes auth-spinner-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    )
  }

  // Always render children - router.replace handles redirect
  // This prevents React hook order issues
  return <>{children}</>
}

