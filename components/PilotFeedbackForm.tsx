'use client'

import { useState } from 'react'
import styles from './PilotFeedbackForm.module.css'

interface FeedbackData {
  speedRating: number | null
  mostAnnoying: string
  whatToChange: string
  additionalComments: string
}

interface PilotFeedbackFormProps {
  onComplete?: (feedback: FeedbackData) => void
  onSkip?: () => void
  context?: string // e.g., "check-in", "triage", "dashboard"
}

export default function PilotFeedbackForm({
  onComplete,
  onSkip,
  context = 'general',
}: PilotFeedbackFormProps) {
  const [feedback, setFeedback] = useState<FeedbackData>({
    speedRating: null,
    mostAnnoying: '',
    whatToChange: '',
    additionalComments: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Log feedback to console (in production, you'd send to an API)
      const feedbackPayload = {
        ...feedback,
        context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      }

      console.log('[PILOT FEEDBACK]', feedbackPayload)

      // In production, send to your analytics endpoint:
      // await fetch('/api/pilot/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(feedbackPayload),
      // })

      // Store in localStorage for manual collection
      const existingFeedback = JSON.parse(
        localStorage.getItem('triagedx_pilot_feedback') || '[]'
      )
      existingFeedback.push(feedbackPayload)
      localStorage.setItem('triagedx_pilot_feedback', JSON.stringify(existingFeedback))

      setIsSubmitted(true)
      onComplete?.(feedback)

      // Auto-close after 2 seconds
      setTimeout(() => {
        onSkip?.()
      }, 2000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>✓</div>
          <h3>Thank you!</h3>
          <p>Your feedback has been recorded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Pilot Feedback</h2>
        <p className={styles.subtitle}>
          Help us improve TRIAGEDX. Your feedback is valuable!
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Question 1: Speed Rating */}
        <div className={styles.question}>
          <label className={styles.label}>
            Q1: Did this feel faster than your current process?
            <span className={styles.required}>*</span>
          </label>
          <div className={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className={`${styles.ratingButton} ${
                  feedback.speedRating === rating ? styles.ratingButtonActive : ''
                }`}
                onClick={() => setFeedback((prev) => ({ ...prev, speedRating: rating }))}
              >
                {rating}
              </button>
            ))}
          </div>
          <div className={styles.ratingLabels}>
            <span>Much Slower</span>
            <span>Much Faster</span>
          </div>
        </div>

        {/* Question 2: Most Annoying */}
        <div className={styles.question}>
          <label htmlFor="mostAnnoying" className={styles.label}>
            Q2: What was the most annoying or confusing part?
          </label>
          <textarea
            id="mostAnnoying"
            value={feedback.mostAnnoying}
            onChange={(e) =>
              setFeedback((prev) => ({ ...prev, mostAnnoying: e.target.value }))
            }
            className={styles.textarea}
            placeholder="e.g., Questions were unclear, buttons too small, flow was confusing..."
            rows={3}
          />
        </div>

        {/* Question 3: What to Change */}
        <div className={styles.question}>
          <label htmlFor="whatToChange" className={styles.label}>
            Q3: What would you change first?
          </label>
          <textarea
            id="whatToChange"
            value={feedback.whatToChange}
            onChange={(e) =>
              setFeedback((prev) => ({ ...prev, whatToChange: e.target.value }))
            }
            className={styles.textarea}
            placeholder="e.g., Add a skip button, make text larger, change the order..."
            rows={3}
          />
        </div>

        {/* Additional Comments */}
        <div className={styles.question}>
          <label htmlFor="additionalComments" className={styles.label}>
            Additional Comments (Optional)
          </label>
          <textarea
            id="additionalComments"
            value={feedback.additionalComments}
            onChange={(e) =>
              setFeedback((prev) => ({ ...prev, additionalComments: e.target.value }))
            }
            className={styles.textarea}
            placeholder="Any other thoughts or suggestions..."
            rows={2}
          />
        </div>

        <div className={styles.actions}>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className={styles.skipButton}
              disabled={isSubmitting}
            >
              Skip
            </button>
          )}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || feedback.speedRating === null}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  )
}

