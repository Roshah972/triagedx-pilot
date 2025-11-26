'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTour } from '@/contexts/DemoTourContext'
import TourOverlay from './TourOverlay'
import styles from './TourOverlay.module.css'

const tourSteps: Record<string, {
  title: string
  body: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  allowInteraction?: boolean
}> = {
  intro: {
    title: 'Welcome to the TRIAGEDX Nurse Pilot Demo',
    body: 'This is a guided walkthrough using fake patients. It\'s designed to show you how TRIAGEDX can streamline ED registration and give you a quick snapshot of patient risk. Please follow the highlighted steps.',
    placement: 'center',
  },
  'nurse-console': {
    title: 'Nurse Console',
    body: 'Here you can see all patients who have checked in through TRIAGEDX. This view summarizes chief complaints, risk scores, and queue position.',
    placement: 'bottom',
  },
  'checkin-entry': {
    title: 'Check-In Form',
    body: 'This is where a walk-in patient (or staff on their behalf) completes the intake form. Let\'s walk through a sample check-in.',
    placement: 'bottom',
  },
  'checkin-overview': {
    title: 'Patient Check-In',
    body: 'This form collects basic demographics, chief complaint, symptom details, and vitals. For this demo, please fill in the sample values shown or use your own fake patient. You don\'t need to think about "perfect" answers—this is just to see workflow.',
    placement: 'bottom',
    allowInteraction: true,
  },
  'checkin-demographics': {
    title: 'Demographics',
    body: 'Start with basic patient information: name, date of birth, and contact details. This data helps create the patient record.',
    placement: 'right',
    allowInteraction: true,
  },
  'checkin-complaint': {
    title: 'Chief Complaint & Symptoms',
    body: 'The chief complaint and symptom questions help TRIAGEDX calculate a provisional Early Warning Score. This gives you a quick risk assessment before you perform clinical triage.',
    placement: 'right',
    allowInteraction: true,
  },
  'checkin-vitals': {
    title: 'Vitals & Risk Indicators',
    body: 'Basic vitals and risk factors are collected here. The provisional EWS (Early Warning Score) appears automatically based on the information provided.',
    placement: 'right',
    allowInteraction: true,
  },
  'checkin-submit': {
    title: 'Submit Demo Patient',
    body: 'When you\'re done, hit Submit. TRIAGEDX will create a patient in the Nurse Console with a provisional risk signal.',
    placement: 'top',
  },
  'back-to-console': {
    title: 'Back to Nurse Console',
    body: 'Click here to return to the Nurse Console and see your newly created patient.',
    placement: 'bottom',
  },
  'new-patient-highlight': {
    title: 'Patient at a Glance',
    body: 'Here you can quickly see key details: name, chief complaint, arrival time, and a provisional Early Warning Score to help you prioritize. Note: This is a demo—in real use, the EWS helps identify patients who may need immediate attention.',
    placement: 'right',
  },
  'wrap-up': {
    title: 'You\'ve completed the TRIAGEDX demo',
    body: 'The real goal is to reduce double-documentation and give you a clearer, faster view of who needs attention first. Please share what felt helpful, confusing, or missing.',
    placement: 'center',
  },
}

export default function DemoTour() {
  const { isActive, currentStep, nextStep, endTour, goToStep } = useTour()
  const router = useRouter()
  const pathname = usePathname()

  // Handle navigation based on tour step
  useEffect(() => {
    if (!isActive || !currentStep) return

    // Navigate to appropriate page for each step
    if (currentStep === 'checkin-entry' && pathname !== '/check-in') {
      router.push('/check-in')
    } else if (currentStep === 'nurse-console' && pathname !== '/staff/dashboard') {
      router.push('/staff/dashboard')
    } else if (currentStep === 'back-to-console' && pathname !== '/staff/dashboard') {
      router.push('/staff/dashboard')
    }
  }, [currentStep, isActive, pathname, router])

  if (!isActive || !currentStep) return null

  // Handle intro and wrap-up as full-screen overlays
  if (currentStep === 'intro' || currentStep === 'wrap-up') {
    const config = tourSteps[currentStep]
    return (
      <div className={styles.introOverlay}>
        <div className={styles.introContent}>
          <h2 className={styles.introTitle}>{config.title}</h2>
          <p className={styles.introBody}>{config.body}</p>
          <div className={styles.introActions}>
            {currentStep === 'intro' && (
              <button
                className={`${styles.introButton} ${styles.introButtonSecondary}`}
                onClick={endTour}
              >
                Skip Demo
              </button>
            )}
            <button
              className={`${styles.introButton} ${styles.introButtonPrimary}`}
              onClick={currentStep === 'wrap-up' ? endTour : nextStep}
            >
              {currentStep === 'wrap-up' ? 'Close' : 'Start Walkthrough'}
            </button>
            {currentStep === 'wrap-up' && (
              <button
                className={`${styles.introButton} ${styles.introButtonSecondary}`}
                onClick={() => {
                  endTour()
                  // Use a small delay to ensure state is reset
                  setTimeout(() => {
                    window.location.href = '/staff/dashboard?demo=1'
                  }, 200)
                }}
              >
                Replay Demo
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Regular step overlay
  const config = tourSteps[currentStep]
  if (!config) return null

  return (
    <TourOverlay
      stepId={currentStep}
      config={{
        ...config,
        onNext: nextStep,
        onSkip: endTour,
      }}
      isActive={true}
    />
  )
}

