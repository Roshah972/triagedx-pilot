'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IntakeSource, Sex } from '@prisma/client'
import styles from './page.module.css'

interface QuickIntakeForm {
  firstName: string
  lastName: string
  approximateAge: string
  chiefComplaintCategory: string
  chiefComplaintText: string
  highRiskQuestions: {
    chestPain: boolean | null
    difficultyBreathing: boolean | null
    alteredMentalStatus: boolean | null
  }
}

export default function QuickIntakePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<QuickIntakeForm>({
    firstName: '',
    lastName: '',
    approximateAge: '',
    chiefComplaintCategory: '',
    chiefComplaintText: '',
    highRiskQuestions: {
      chestPain: null,
      difficultyBreathing: null,
      alteredMentalStatus: null,
    },
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFieldChange = (field: keyof QuickIntakeForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRiskQuestionChange = (question: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      highRiskQuestions: {
        ...prev.highRiskQuestions,
        [question]: value,
      },
    }))
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      // Validate required fields
      if (!formData.firstName || !formData.approximateAge || !formData.chiefComplaintCategory) {
        setError('Please fill in all required fields')
        return
      }

      // Prepare symptom answers from high-risk questions
      const symptomAnswers: Record<string, any> = {}
      if (formData.highRiskQuestions.chestPain !== null) {
        symptomAnswers.chestPain = formData.highRiskQuestions.chestPain
      }
      if (formData.highRiskQuestions.difficultyBreathing !== null) {
        symptomAnswers.severeShortnessOfBreath = formData.highRiskQuestions.difficultyBreathing
        symptomAnswers.difficultyBreathing = formData.highRiskQuestions.difficultyBreathing
      }
      if (formData.highRiskQuestions.alteredMentalStatus !== null) {
        symptomAnswers.confusion = formData.highRiskQuestions.alteredMentalStatus
      }

      const response = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName || undefined,
          approximateAge: parseInt(formData.approximateAge),
          sex: Sex.UNKNOWN, // Not required for quick intake
          intakeSource: IntakeSource.STAFF_ASSISTED,
          chiefComplaintCategory: formData.chiefComplaintCategory,
          chiefComplaintText: formData.chiefComplaintText || undefined,
          symptomAnswers: Object.keys(symptomAnswers).length > 0 ? symptomAnswers : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit intake')
      }

      const result = await response.json()
      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/staff/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          <h1>✓ Quick Intake Submitted</h1>
          <p>Patient has been added to the waiting room.</p>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Staff-Assisted Quick Intake</h1>
        <button
          type="button"
          onClick={() => router.push('/staff/dashboard')}
          className={styles.backButton}
        >
          ← Back to Dashboard
        </button>
      </header>

      <div className={styles.content}>
        <div className={styles.infoBox}>
          <p>
            <strong>Use this form for patients who cannot complete self-check-in.</strong>
          </p>
          <p>Only minimal information is required. Full demographics can be completed later.</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="firstName">
              Name or Alias <span className={styles.required}>*</span>
            </label>
            <input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleFieldChange('firstName', e.target.value)}
              placeholder="First name or alias"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="lastName">Last Name (if known)</label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleFieldChange('lastName', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="approximateAge">
              Approximate Age <span className={styles.required}>*</span>
            </label>
            <input
              id="approximateAge"
              type="number"
              min="0"
              max="150"
              value={formData.approximateAge}
              onChange={(e) => handleFieldChange('approximateAge', e.target.value)}
              placeholder="e.g., 45"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="chiefComplaintCategory">
              Chief Complaint <span className={styles.required}>*</span>
            </label>
            <select
              id="chiefComplaintCategory"
              value={formData.chiefComplaintCategory}
              onChange={(e) => handleFieldChange('chiefComplaintCategory', e.target.value)}
              required
            >
              <option value="">Select...</option>
              <option value="Chest Pain">Chest Pain</option>
              <option value="Shortness of Breath">Shortness of Breath</option>
              <option value="Abdominal Pain">Abdominal Pain</option>
              <option value="Stroke-like Symptoms">Stroke-like Symptoms</option>
              <option value="Trauma">Trauma</option>
              <option value="Severe Headache">Severe Headache</option>
              <option value="Altered Mental Status">Altered Mental Status</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="chiefComplaintText">Description (optional)</label>
            <textarea
              id="chiefComplaintText"
              value={formData.chiefComplaintText}
              onChange={(e) => handleFieldChange('chiefComplaintText', e.target.value)}
              rows={3}
              placeholder="Brief description of the complaint..."
            />
          </div>

          <div className={styles.riskQuestions}>
            <h3>High-Risk Screening Questions</h3>
            <p className={styles.helpText}>
              Answer these quick screening questions to help assess risk level.
            </p>

            <div className={styles.questionGroup}>
              <label>Chest pain or pressure?</label>
              <div className={styles.yesnoButtons}>
                <button
                  type="button"
                  className={`${styles.yesnoButton} ${
                    formData.highRiskQuestions.chestPain === true ? styles.active : ''
                  }`}
                  onClick={() => handleRiskQuestionChange('chestPain', true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`${styles.yesnoButton} ${
                    formData.highRiskQuestions.chestPain === false ? styles.active : ''
                  }`}
                  onClick={() => handleRiskQuestionChange('chestPain', false)}
                >
                  No
                </button>
              </div>
            </div>

            <div className={styles.questionGroup}>
              <label>Difficulty breathing or shortness of breath?</label>
              <div className={styles.yesnoButtons}>
                <button
                  type="button"
                  className={`${styles.yesnoButton} ${
                    formData.highRiskQuestions.difficultyBreathing === true ? styles.active : ''
                  }`}
                  onClick={() => handleRiskQuestionChange('difficultyBreathing', true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`${styles.yesnoButton} ${
                    formData.highRiskQuestions.difficultyBreathing === false ? styles.active : ''
                  }`}
                  onClick={() => handleRiskQuestionChange('difficultyBreathing', false)}
                >
                  No
                </button>
              </div>
            </div>

            <div className={styles.questionGroup}>
              <label>Confusion or altered mental status?</label>
              <div className={styles.yesnoButtons}>
                <button
                  type="button"
                  className={`${styles.yesnoButton} ${
                    formData.highRiskQuestions.alteredMentalStatus === true ? styles.active : ''
                  }`}
                  onClick={() => handleRiskQuestionChange('alteredMentalStatus', true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`${styles.yesnoButton} ${
                    formData.highRiskQuestions.alteredMentalStatus === false ? styles.active : ''
                  }`}
                  onClick={() => handleRiskQuestionChange('alteredMentalStatus', false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => router.push('/staff/dashboard')}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={styles.submitButton}
            >
              {submitting ? 'Submitting...' : 'Submit Quick Intake'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

