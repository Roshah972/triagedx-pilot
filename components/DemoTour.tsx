'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTour, type TourStep } from '@/contexts/DemoTourContext'
import TourOverlay from './TourOverlay'
import styles from './TourOverlay.module.css'

const tourSteps: Record<string, {
  title: string
  body: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  allowInteraction?: boolean
}> = {
  intro: {
    title: 'Welcome to TRIAGEDX Demo',
    body: 'This demo has two parts: (1) Patient Intake Form - where patients check in, and (2) Nurse Console - where you see all patients. We\'ll walk through a simulated patient check-in with pre-filled data. Just click Next to proceed through each section.',
    placement: 'center',
  },
  'form-intro': {
    title: 'Patient Intake Form',
    body: 'This is the patient check-in form. The form is already filled with sample patient data. We\'ll walk through each section to show you what information is collected.',
    placement: 'bottom',
  },
  'form-demographics': {
    title: 'Demographics Section',
    body: 'This section collects basic patient information: name, date of birth, sex, and contact details. Notice the form is already filled with sample data.',
    placement: 'right',
    allowInteraction: true,
  },
  'form-complaint': {
    title: 'Chief Complaint',
    body: 'Here patients select their main reason for visiting. This helps TRIAGEDX understand the urgency and route to appropriate care.',
    placement: 'right',
    allowInteraction: true,
  },
  'form-symptoms': {
    title: 'Symptoms & Risk Factors',
    body: 'This section asks targeted questions based on the chief complaint. The answers help calculate a provisional Early Warning Score.',
    placement: 'right',
    allowInteraction: true,
  },
  'form-submit': {
    title: 'Submit Patient',
    body: 'Once all information is collected, click Submit to create the patient record. The patient will then appear in your Nurse Console.',
    placement: 'top',
  },
  'nurse-console': {
    title: 'Nurse Console',
    body: 'Here you can see all patients who have checked in. Each card shows key information including the provisional Early Warning Score to help you prioritize. This completes the demo!',
    placement: 'bottom',
  },
}

export default function DemoTour() {
  const { isActive, currentStep, nextStep, endTour } = useTour()
  const router = useRouter()
  const pathname = usePathname()

  // Handle navigation based on tour step
  useEffect(() => {
    if (!isActive || !currentStep) return

    // Navigate to appropriate page for each step
    if (currentStep === 'form-demographics' && pathname !== '/check-in') {
      router.push('/check-in')
    } else if (currentStep === 'nurse-console' && pathname !== '/staff/dashboard') {
      router.push('/staff/dashboard')
    }
  }, [currentStep, isActive, pathname, router])

  if (!isActive || !currentStep) return null

  // Handle intro as full-screen overlay
  if (currentStep === 'intro') {
    const config = tourSteps[currentStep]
    return (
      <div className={styles.introOverlay}>
        <div className={styles.introContent}>
          <h2 className={styles.introTitle}>{config.title}</h2>
          <p className={styles.introBody}>{config.body}</p>
          <div className={styles.introActions}>
            <button
              className={`${styles.introButton} ${styles.introButtonSecondary}`}
              onClick={endTour}
            >
              Skip Demo
            </button>
            <button
              className={`${styles.introButton} ${styles.introButtonPrimary}`}
              onClick={nextStep}
            >
              Start Walkthrough
            </button>
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
