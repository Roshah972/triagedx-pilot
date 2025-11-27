'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export type TourStep = 
  | 'intro'
  | 'form-demographics'
  | 'form-registration'
  | 'form-insurance'
  | 'form-complaint'
  | 'form-symptoms'
  | 'form-review'
  | 'form-submit'
  | 'nurse-console'

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
      'form-demographics',
      'form-registration',
      'form-insurance',
      'form-complaint',
      'form-symptoms',
      'form-review',
      'form-submit',
      'nurse-console',
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

  // Auto-start demo on check-in page
  useEffect(() => {
    if (typeof window !== 'undefined' && pathname === '/check-in') {
      // Always show demo on check-in page (no localStorage check)
      const timer = setTimeout(() => {
        if (!isActive) {
          // Listen for start event from DemoGuide
          const handleStart = () => {
            startTour()
            setCurrentStep('form-demographics')
          }
          window.addEventListener('startDemoTour', handleStart)
          return () => window.removeEventListener('startDemoTour', handleStart)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [pathname, isActive, startTour])

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
