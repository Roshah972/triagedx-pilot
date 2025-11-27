'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

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
  const router = useRouter()
  const pathname = usePathname()
  
  // Use window.location to read search params to avoid Suspense requirement
  const [demoParam, setDemoParam] = useState<string | null>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setDemoParam(params.get('demo'))
    }
  }, [pathname])

  const endTour = useCallback(() => {
    setIsActive(false)
    setCurrentStep(null)
    if (typeof window !== 'undefined') {
      localStorage.setItem('triagedx_demo_seen', 'true')
    }
  }, [])

  const startTour = useCallback(() => {
    setIsActive(true)
    setCurrentStep('intro')
    // Remove demo param from URL but keep it in history
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('demo') === '1') {
        router.replace(pathname, { scroll: false })
      }
    }
  }, [router, pathname])

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
  }, [currentStep, endTour])

  const goToStep = useCallback((step: TourStep) => {
    setCurrentStep(step)
  }, [])

  // Check if demo should auto-start
  useEffect(() => {
    const hasSeenDemo = typeof window !== 'undefined' 
      ? localStorage.getItem('triagedx_demo_seen') === 'true'
      : false

    if (demoParam === '1' && !hasSeenDemo) {
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [demoParam, startTour])

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
    // Return default values instead of throwing - prevents hook order issues
    return {
      isActive: false,
      currentStep: null,
      startTour: () => {},
      nextStep: () => {},
      endTour: () => {},
      goToStep: () => {},
    }
  }
  return context
}
