'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTour } from '@/contexts/DemoTourContext'
import styles from './DemoGuide.module.css'

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/1xQsMjHKglHnCrcd1IZ2DVJK3xEhoSpfIN8ACA3X2ZzU/edit'

interface StepInfo {
  title: string
  description: string
  stepNumber: number
  totalSteps: number
}

const formStepInfo: Record<string, StepInfo> = {
  'demographics': {
    title: 'Step 1: Demographics',
    description: 'Enter basic patient information like name, date of birth, and contact details.',
    stepNumber: 1,
    totalSteps: 6,
  },
  'registration': {
    title: 'Step 2: Identification',
    description: 'Upload ID documents (optional). This helps verify patient identity.',
    stepNumber: 2,
    totalSteps: 6,
  },
  'insurance': {
    title: 'Step 3: Insurance & Billing',
    description: 'Provide insurance information or select self-pay. This helps with billing.',
    stepNumber: 3,
    totalSteps: 6,
  },
  'complaint': {
    title: 'Step 4: Chief Complaint',
    description: 'Select the main reason for your visit. This helps us understand your needs.',
    stepNumber: 4,
    totalSteps: 6,
  },
  'symptoms': {
    title: 'Step 5: Symptoms & Risk Factors',
    description: 'Answer questions about your symptoms and medical history. This helps determine urgency.',
    stepNumber: 5,
    totalSteps: 6,
  },
  'review': {
    title: 'Step 6: Review & Submit',
    description: 'Review all information and submit your intake form.',
    stepNumber: 6,
    totalSteps: 6,
  },
}

export default function DemoGuide() {
  const { isActive, currentStep, nextStep, endTour, startTour } = useTour()
  const router = useRouter()
  const [showIntro, setShowIntro] = useState(false)
  const [currentFormStep, setCurrentFormStep] = useState<string | null>(null)

  // Auto-start demo when component mounts on check-in page
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/check-in' && !isActive) {
      // Check if demo was already seen
      const hasSeenDemo = localStorage.getItem('triagedx_demo_seen') === 'true'
      if (!hasSeenDemo) {
        setShowIntro(true)
      }
    }
  }, [isActive])

  // Track form step changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isActive) {
      const handleStepChange = (e: CustomEvent) => {
        setCurrentFormStep(e.detail.step)
      }
      window.addEventListener('formStepChange' as any, handleStepChange)
      return () => window.removeEventListener('formStepChange' as any, handleStepChange)
    }
  }, [isActive])

  const handleStartDemo = () => {
    setShowIntro(false)
    startTour()
    // Set initial form step
    setTimeout(() => {
      setCurrentFormStep('demographics')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('formStepChange', { 
          detail: { step: 'demographics' } 
        }))
      }
    }, 100)
  }

  const handleNext = () => {
    if (currentFormStep && formStepInfo[currentFormStep]) {
      // Move to next form step
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nextFormStep'))
      }
    } else {
      nextStep()
    }
  }

  const handleSkip = () => {
    setShowIntro(false)
    endTour()
  }

  // Intro popup
  if (showIntro && !isActive) {
    return (
      <div className={styles.introOverlay}>
        <div className={styles.introPopup}>
          <h2>TRIAGEDX Demo</h2>
          <p>
            Welcome! This is a demo of the TRIAGEDX patient intake system. 
            We'll walk you through filling out the patient form step by step.
          </p>
          <p>
            <strong>This is a demo mode</strong> - feel free to explore and interact with everything.
            After completing the form, you'll see the nurse console with sample patients.
          </p>
          <div className={styles.introActions}>
            <button onClick={handleStartDemo} className={styles.primaryButton}>
              Start Demo
            </button>
            <button onClick={handleSkip} className={styles.skipButton}>
              Skip Demo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Form step guide
  if (isActive && currentFormStep && formStepInfo[currentFormStep]) {
    const info = formStepInfo[currentFormStep]
    return (
      <div className={styles.guideFloating}>
        <div className={styles.guideCard}>
          <div className={styles.stepIndicator}>
            Step {info.stepNumber} of {info.totalSteps}
          </div>
          <h3>{info.title}</h3>
          <p>{info.description}</p>
          <div className={styles.guideActions}>
            <button onClick={handleNext} className={styles.nextButton}>
              Next Step
            </button>
            <button onClick={handleSkip} className={styles.skipButton}>
              Skip Guide
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

