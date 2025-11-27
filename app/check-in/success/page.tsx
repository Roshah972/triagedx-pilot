'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTour } from '@/contexts/DemoTourContext'
import PilotFeedbackForm from '@/components/PilotFeedbackForm'
import styles from './page.module.css'

export default function CheckInSuccessPage() {
  const router = useRouter()
  const { currentStep: tourStep, isActive: tourActive, nextStep: tourNextStep } = useTour()
  const [showFeedback, setShowFeedback] = useState(false)
  
  // Read search params client-side to avoid Suspense requirement
  const [visitId, setVisitId] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setVisitId(params.get('visitId'))
    }
  }, [])
  
  // In demo mode, redirect to nurse console
  useEffect(() => {
    if (tourActive) {
      setTimeout(() => {
        router.push('/staff/dashboard?demo=complete')
      }, 2000)
    }
  }, [tourActive, router])

  // Auto-show feedback after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFeedback(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={styles.container}>
      {!showFeedback ? (
        <div className={styles.successContent}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Check-In Complete</h1>
          <p className={styles.message}>
            Your information has been submitted successfully.
          </p>
          {visitId && (
            <p className={styles.visitId}>
              Visit ID: <strong>{visitId}</strong>
            </p>
          )}
          <p className={styles.nextSteps}>
            Please wait in the waiting area. A nurse will call you shortly.
          </p>
          <div className={styles.actions}>
            {tourActive ? (
              <Link 
                href="/staff/dashboard?demo=complete" 
                className={styles.button}
              >
                Go to Nurse Console
              </Link>
            ) : (
              <Link href="/" className={styles.button}>
                Return Home
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.feedbackContainer}>
          <PilotFeedbackForm
            context="check-in"
            onComplete={() => {
              // Feedback submitted, can redirect or show success
            }}
            onSkip={() => setShowFeedback(false)}
          />
          {!showFeedback && (
            <div className={styles.backToHome}>
              <Link href="/" className={styles.link}>
                Return Home
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

