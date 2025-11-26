'use client'

import { useState, useEffect, useMemo } from 'react'
import Chip from './Chip'
import { ChipGroup } from './Chip'
import SlideTransition, { SlideContainer } from './SlideTransition'
import type { EnhancedQuestionDefinition, QuestionFlowState } from '@/lib/triage/questionEngine'
import type { TriagePatientContext, ChiefComplaintCategory } from '@/lib/triage/types'
import {
  buildQuestionFlow,
  updateQuestionFlow,
  skipQuestion,
  getQuestionOptions,
  validateQuestionAnswer,
} from '@/lib/triage/questionEngine'
import styles from './DynamicQuestionFlow.module.css'

export interface DynamicQuestionFlowProps {
  complaintCategory: ChiefComplaintCategory
  patientContext: TriagePatientContext
  initialAnswers?: Record<string, unknown>
  onAnswerChange?: (answers: Record<string, unknown>) => void
  onComplete?: (answers: Record<string, unknown>) => void
  language?: string
  accessibilityMode?: boolean
}

/**
 * Dynamic Question Flow Component
 * 
 * Displays questions one at a time with:
 * - Chip-based selection UI
 * - Slide transitions between questions
 * - Real-time question updates based on answers
 * - Complex conditional logic
 */
export default function DynamicQuestionFlow({
  complaintCategory,
  patientContext,
  initialAnswers = {},
  onAnswerChange,
  onComplete,
  language = 'en',
  accessibilityMode = false,
}: DynamicQuestionFlowProps) {
  const [flowState, setFlowState] = useState<QuestionFlowState>(() => {
    try {
      return buildQuestionFlow(complaintCategory, patientContext, initialAnswers)
    } catch (error) {
      console.error('Error building initial question flow:', error)
      // Return empty flow state as fallback
      return {
        currentQuestionIndex: 0,
        visibleQuestions: [],
        answeredQuestions: {},
        questionHistory: [],
        skippedQuestions: new Set(),
      }
    }
  })
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Update flow when answers change
  useEffect(() => {
    try {
      const newFlow = buildQuestionFlow(complaintCategory, patientContext, flowState.answeredQuestions)
      setFlowState(newFlow)
      setErrorMessage(null) // Clear any previous errors
    } catch (error) {
      console.error('Error updating question flow:', error)
      setErrorMessage('An error occurred while loading questions. Please try again.')
    }
  }, [complaintCategory, patientContext])

  // Notify parent of answer changes
  useEffect(() => {
    try {
      onAnswerChange?.(flowState.answeredQuestions)
    } catch (error) {
      console.error('Error notifying parent of answer changes:', error)
    }
  }, [flowState.answeredQuestions, onAnswerChange])

  // Check if flow is complete
  const isComplete = flowState.visibleQuestions.length === 0

  useEffect(() => {
    if (isComplete && flowState.questionHistory.length > 0) {
      try {
        onComplete?.(flowState.answeredQuestions)
      } catch (error) {
        console.error('Error calling onComplete:', error)
      }
    }
  }, [isComplete, flowState.answeredQuestions, flowState.questionHistory.length, onComplete])

  const handleAnswer = (question: EnhancedQuestionDefinition, value: any) => {
    // Validate answer
    const validation = validateQuestionAnswer(question, value, flowState.answeredQuestions)
    if (!validation.valid) {
      // Show error (could be enhanced with toast/alert)
      console.warn('Validation error:', validation.error)
      alert(validation.error) // Simple alert for now - should be replaced with proper UI
      return
    }

    // CRITICAL: Don't allow skipping required questions
    if (question.required && (value === null || value === undefined || value === '')) {
      alert('This question is required for clinical triage and cannot be skipped')
      return
    }

    // Update flow state
    const newFlow = updateQuestionFlow(
      flowState,
      question.id,
      value,
      complaintCategory,
      patientContext
    )

    setFlowState(newFlow)

    // Slide to next question with smooth transition
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentSlideIndex(0) // Always show first visible question
      setIsTransitioning(false)
    }, 300)
  }

  const handleSkip = (question: EnhancedQuestionDefinition) => {
    // CRITICAL SAFETY CHECK: Cannot skip required questions
    if (question.required || !question.skippable) {
      alert('This question is required for clinical triage and cannot be skipped')
      return
    }

    const newFlow = skipQuestion(flowState, question.id)
    setFlowState(newFlow)
    
    // Slide to next question
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentSlideIndex(0)
      setIsTransitioning(false)
    }, 300)
  }

  const currentQuestion = flowState.visibleQuestions[currentSlideIndex]

  // Build chips for current question
  const questionChips = useMemo(() => {
    if (!currentQuestion) return []

    const options = getQuestionOptions(currentQuestion, flowState.answeredQuestions, patientContext)

    if (currentQuestion.type === 'BOOLEAN') {
      return [
        { label: language === 'es' ? 'Sí' : 'Yes', value: true },
        { label: language === 'es' ? 'No' : 'No', value: false },
      ]
    }

    if (currentQuestion.type === 'CHOICE' || currentQuestion.type === 'SCALE') {
      return options.map((opt) => ({
        label: opt.label,
        value: opt.value,
      }))
    }

    return []
  }, [currentQuestion, flowState.answeredQuestions, patientContext, language])

  // Show error message if there's an error
  if (errorMessage) {
    return (
      <div className={styles.errorMessage}>
        <h3>{language === 'es' ? 'Error' : 'Error'}</h3>
        <p>{errorMessage}</p>
        <button
          onClick={() => {
            setErrorMessage(null)
            try {
              const newFlow = buildQuestionFlow(complaintCategory, patientContext, {})
              setFlowState(newFlow)
            } catch (error) {
              console.error('Error rebuilding flow:', error)
            }
          }}
          className={styles.retryButton}
        >
          {language === 'es' ? 'Reintentar' : 'Retry'}
        </button>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className={styles.completeMessage}>
        <h3>{language === 'es' ? 'Preguntas completadas' : 'Questions Complete'}</h3>
        <p>
          {language === 'es'
            ? 'Gracias por proporcionar esta información. Haga clic en "Siguiente" para continuar.'
            : 'Thank you for providing this information. Click "Next" to continue.'}
        </p>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className={styles.loadingMessage}>
        {language === 'es' ? 'Cargando preguntas...' : 'Loading questions...'}
      </div>
    )
  }

  const currentAnswer = flowState.answeredQuestions[currentQuestion.id] as string | number | boolean | undefined

  return (
    <div className={`${styles.questionFlow} ${accessibilityMode ? styles.accessibilityMode : ''}`}>
      {/* Progress indicator */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width: `${((flowState.questionHistory.length) / (flowState.questionHistory.length + flowState.visibleQuestions.length)) * 100}%`,
          }}
        />
        <span className={styles.progressText}>
          {language === 'es' ? 'Pregunta' : 'Question'} {flowState.questionHistory.length + 1} /{' '}
          {flowState.questionHistory.length + flowState.visibleQuestions.length}
        </span>
      </div>

      {/* Question slides */}
      <SlideContainer
        currentIndex={currentSlideIndex}
        direction="left"
        duration={300}
        className={styles.slideContainer}
      >
        <div className={styles.questionSlide}>
          <div className={styles.questionHeader}>
            <h3 className={styles.questionLabel}>{currentQuestion.label}</h3>
            {currentQuestion.required && (
              <span className={styles.requiredBadge}>
                {language === 'es' ? 'Requerido' : 'Required'}
              </span>
            )}
          </div>

          {/* Chip selection - All questions use chips */}
          <div className={styles.chipContainer}>
            <ChipGroup
              chips={questionChips}
              selectedValues={currentAnswer}
              onSelectionChange={(value) => handleAnswer(currentQuestion, value)}
              multiSelect={false}
              variant="primary"
              size={accessibilityMode ? 'large' : 'medium'}
              orientation="horizontal"
            />
          </div>

          {/* Skip button */}
          {currentQuestion.skippable && (
            <button
              type="button"
              onClick={() => handleSkip(currentQuestion)}
              className={styles.skipButton}
            >
              {language === 'es' ? 'Omitir' : 'Skip'}
            </button>
          )}
        </div>
      </SlideContainer>

      {/* Navigation hints */}
      {flowState.visibleQuestions.length > 1 && (
        <div className={styles.navigationHints}>
          <span className={styles.hintText}>
            {language === 'es'
              ? 'Selecciona una opción para continuar'
              : 'Select an option to continue'}
          </span>
        </div>
      )}
    </div>
  )
}

