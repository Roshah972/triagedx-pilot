'use client'

import { useEffect, useState, useRef } from 'react'
import { useTour } from '@/contexts/DemoTourContext'
import styles from './TourOverlay.module.css'

interface TourStepConfig {
  title: string
  body: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  showArrow?: boolean
  allowInteraction?: boolean
  onNext?: () => void
  onSkip?: () => void
}

interface TourOverlayProps {
  stepId: string
  config: TourStepConfig
  isActive: boolean
}

export default function TourOverlay({ stepId, config, isActive }: TourOverlayProps) {
  const { nextStep, endTour, currentStep } = useTour()
  const [position, setPosition] = useState<{ top: number; left: number; arrow?: string } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const targetElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) {
      setPosition(null)
      return
    }

    // Find target element by data-tour-id
    const target = document.querySelector(`[data-tour-id="${stepId}"]`) as HTMLElement
    if (!target) {
      // If no target found, center the tooltip
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      })
      return
    }

    targetElementRef.current = target

    const updatePosition = () => {
      if (!target || !tooltipRef.current) return

      const rect = target.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const placement = config.placement || 'bottom'
      const spacing = 16

      let top = 0
      let left = 0
      let arrow = ''

      switch (placement) {
        case 'top':
          top = rect.top - tooltipRect.height - spacing
          left = rect.left + rect.width / 2 - tooltipRect.width / 2
          arrow = 'bottom'
          break
        case 'bottom':
          top = rect.bottom + spacing
          left = rect.left + rect.width / 2 - tooltipRect.width / 2
          arrow = 'top'
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipRect.height / 2
          left = rect.left - tooltipRect.width - spacing
          arrow = 'right'
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipRect.height / 2
          left = rect.right + spacing
          arrow = 'left'
          break
        case 'center':
          top = window.innerHeight / 2 - tooltipRect.height / 2
          left = window.innerWidth / 2 - tooltipRect.width / 2
          break
      }

      // Keep tooltip within viewport
      top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10))
      left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10))

      setPosition({ top, left, arrow })
    }

    updatePosition()

    // Highlight target element
    target.classList.add(styles.tourHighlight)

    // Handle window resize
    const handleResize = () => updatePosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      target.classList.remove(styles.tourHighlight)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isActive, stepId, config.placement])

  if (!isActive || !position) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!config.allowInteraction) {
      e.preventDefault()
      e.stopPropagation()
      // Prevent all clicks outside highlighted area
      return false
    }
  }

  // Freeze interactions on non-highlighted elements
  useEffect(() => {
    if (!isActive || config.allowInteraction) return

    const preventInteraction = (e: Event) => {
      const target = e.target as HTMLElement
      if (targetElementRef.current && !targetElementRef.current.contains(target)) {
        // Check if click is on tooltip or backdrop
        const tooltip = tooltipRef.current
        if (tooltip && !tooltip.contains(target)) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
        }
      }
    }

    // Prevent clicks, touches, and keyboard interactions
    document.addEventListener('click', preventInteraction, true)
    document.addEventListener('touchstart', preventInteraction, true)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.key === 'Enter') {
        const target = e.target as HTMLElement
        if (targetElementRef.current && !targetElementRef.current.contains(target)) {
          e.preventDefault()
        }
      }
    }, true)

    return () => {
      document.removeEventListener('click', preventInteraction, true)
      document.removeEventListener('touchstart', preventInteraction, true)
    }
  }, [isActive, config.allowInteraction])

  const handleNext = () => {
    // If this is the checkin-entry step and target is clickable, allow click through
    if (stepId === 'checkin-entry' && targetElementRef.current) {
      const element = targetElementRef.current as HTMLElement
      if (element.tagName === 'A' || element.tagName === 'BUTTON') {
        element.click()
        setTimeout(() => {
          nextStep()
        }, 500)
        return
      }
    }
    
    if (config.onNext) {
      config.onNext()
    } else {
      nextStep()
    }
  }

  const handleSkip = () => {
    if (config.onSkip) {
      config.onSkip()
    } else {
      endTour()
    }
  }

  return (
    <>
      {/* Backdrop - Freeze frame effect */}
      <div
        className={styles.backdrop}
        onClick={handleBackdropClick}
        style={{
          pointerEvents: config.allowInteraction ? 'none' : 'auto',
          cursor: config.allowInteraction ? 'default' : 'not-allowed',
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`${styles.tooltip} ${styles[`arrow-${position.arrow}`] || ''}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <button
          className={styles.closeButton}
          onClick={handleSkip}
          aria-label="Close tour"
        >
          ×
        </button>
        <h3 className={styles.tooltipTitle}>{config.title}</h3>
        <p className={styles.tooltipBody}>{config.body}</p>
        <div className={styles.tooltipActions}>
          {currentStep !== 'intro' && (
            <button className={styles.skipButton} onClick={handleSkip}>
              Skip Demo
            </button>
          )}
          <button className={styles.nextButton} onClick={handleNext}>
            {currentStep === 'nurse-console-view' ? 'Close' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}

