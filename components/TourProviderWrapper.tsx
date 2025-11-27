'use client'

import { Suspense } from 'react'
import { DemoTourProvider } from '@/contexts/DemoTourContext'
import DemoTour from './DemoTour'

function TourProviderContent({ children }: { children: React.ReactNode }) {
  return (
    <DemoTourProvider>
      {children}
      <DemoTour />
    </DemoTourProvider>
  )
}

export default function TourProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <TourProviderContent>{children}</TourProviderContent>
    </Suspense>
  )
}


