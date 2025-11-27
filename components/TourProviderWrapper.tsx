'use client'

import { DemoTourProvider } from '@/contexts/DemoTourContext'
import DemoTour from './DemoTour'

export default function TourProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DemoTourProvider>
      {children}
      <DemoTour />
    </DemoTourProvider>
  )
}


