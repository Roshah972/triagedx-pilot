'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTour } from '@/contexts/DemoTourContext'
import PilotFeedbackForm from '@/components/PilotFeedbackForm'
import styles from './page.module.css'

export default function CheckInSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentStep: tourStep, isActive: tourActive, nextStep: tourNextStep } = useTour()
  const [showFeedback, setShowFeedback] = useState(false)
  const visitId = searchParams.get('visitId')
  
  // If in tour, show nurse console prompt instead of feedback
  useEffect(() => {
    if (tourActive && tourStep === 'nurse-console-prompt') {
      setShowFeedback(false)
    }
  }, [tourActive, tourStep])

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
            {tourActive && tourStep === 'nurse-console-prompt' ? (
              <Link 
                href="/staff/dashboard" 
                className={styles.button}
                data-tour-id="nurse-console-prompt"
                onClick={() => {
                  setTimeout(() => tourNextStep(), 500)
                }}
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

