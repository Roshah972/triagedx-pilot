'use client'

import { useState, useEffect, ReactNode, Children } from 'react'
import styles from './SlideTransition.module.css'

export interface SlideTransitionProps {
  children: ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
  active: boolean
  onTransitionEnd?: () => void
  duration?: number
  className?: string
}

/**
 * Slide transition component for smooth question navigation
 */
export default function SlideTransition({
  children,
  direction = 'left',
  active,
  onTransitionEnd,
  duration = 300,
  className = '',
}: SlideTransitionProps) {
  const [isVisible, setIsVisible] = useState(active)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (active) {
      setIsVisible(true)
      // Trigger animation after a brief delay
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
      // Hide after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false)
        onTransitionEnd?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [active, duration, onTransitionEnd])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`${styles.slideContainer} ${styles[direction]} ${
        isAnimating ? styles.active : ''
      } ${className}`}
      style={{ '--duration': `${duration}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

/**
 * Slide container for managing multiple slides
 */
export interface SlideContainerProps {
  currentIndex: number
  children: ReactNode | ReactNode[]  // Can be single child or array
  direction?: 'left' | 'right' | 'up' | 'down'
  duration?: number
  className?: string
}

export function SlideContainer({
  currentIndex,
  children,
  direction = 'left',
  duration = 300,
  className = '',
}: SlideContainerProps) {
  const [prevIndex, setPrevIndex] = useState(currentIndex)

  useEffect(() => {
    setPrevIndex(currentIndex)
  }, [currentIndex])

  const slideDirection = currentIndex > prevIndex ? direction : 
    direction === 'left' ? 'right' : 
    direction === 'right' ? 'left' :
    direction === 'up' ? 'down' : 'up'

  // Convert children to array using React.Children utilities
  // This properly handles React elements, fragments, and arrays
  const childrenArray = Children.toArray(children)

  return (
    <div className={`${styles.slideWrapper} ${className}`}>
      {childrenArray.map((child, index) => (
        <SlideTransition
          key={index}
          direction={slideDirection}
          active={index === currentIndex}
          duration={duration}
        >
          {child}
        </SlideTransition>
      ))}
    </div>
  )
}

