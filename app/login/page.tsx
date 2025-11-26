'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_PILOT_PASSWORD || 'pilot2024'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Small delay to prevent instant feedback (UX)
    await new Promise(resolve => setTimeout(resolve, 300))

    if (password === CORRECT_PASSWORD) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('triagedx_pilot_authed', '1')
        // Also store timestamp for session management
        localStorage.setItem('triagedx_pilot_authed_at', Date.now().toString())
      }
      router.push('/')
      router.refresh()
    } else {
      setError('Incorrect password. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>TRIAGEDX Pilot</h1>
          <p className={styles.subtitle}>Nurse Usability Demo</p>
        </div>

        <div className={styles.disclaimer}>
          <p><strong>Demo Environment</strong></p>
          <p>This is a fake-data usability pilot. No real patient data is used.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Enter Pilot Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Pilot password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              className={styles.input}
              autoFocus
              disabled={isLoading}
            />
            {error && <p className={styles.error}>{error}</p>}
          </div>

          <button 
            type="submit" 
            className={styles.button}
            disabled={isLoading || !password}
          >
            {isLoading ? 'Verifying...' : 'Enter Demo'}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            For questions or issues, contact the pilot coordinator.
          </p>
        </div>
      </div>
    </div>
  )
}

