'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export type TourStep = 
  | 'intro'
  | 'form-intro'
  | 'form-demographics'
  | 'form-complaint'
  | 'form-symptoms'
  | 'form-submit'
  | 'nurse-console-prompt'
  | 'nurse-console-view'

interface TourContextType {
  isActive: boolean
  currentStep: TourStep | null
  startTour: () => void
  nextStep: () => void
  endTour: () => void
  goToStep: (step: TourStep) => void
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function DemoTourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState<TourStep | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Check if demo should auto-start
  useEffect(() => {
    const demoParam = searchParams.get('demo')
    const hasSeenDemo = typeof window !== 'undefined' 
      ? localStorage.getItem('triagedx_demo_seen') === 'true'
      : false

    if (demoParam === '1') {
      // Small delay to ensure page is loaded
      setTimeout(() => {
        startTour()
      }, 500)
    }
  }, [searchParams])

  const startTour = useCallback(() => {
    setIsActive(true)
    setCurrentStep('intro')
    // Remove demo param from URL but keep it in history
    if (searchParams.get('demo') === '1') {
      router.replace(pathname, { scroll: false })
    }
  }, [router, pathname, searchParams])

  const nextStep = useCallback(() => {
    if (!currentStep) return

    const stepOrder: TourStep[] = [
      'intro',
      'form-intro',
      'form-demographics',
      'form-complaint',
      'form-symptoms',
      'form-submit',
      'nurse-console-prompt',
      'nurse-console-view',
    ]

    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    } else {
      endTour()
    }
  }, [currentStep])

  const goToStep = useCallback((step: TourStep) => {
    setCurrentStep(step)
  }, [])

  const endTour = useCallback(() => {
    setIsActive(false)
    setCurrentStep(null)
    if (typeof window !== 'undefined') {
      localStorage.setItem('triagedx_demo_seen', 'true')
    }
  }, [])

  // Handle ESC key to exit tour
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        endTour()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isActive, endTour])

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        startTour,
        nextStep,
        endTour,
        goToStep,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (context === undefined) {
    throw new Error('useTour must be used within a DemoTourProvider')
  }
  return context
}
