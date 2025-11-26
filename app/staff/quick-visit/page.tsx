'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrivalPath, VisitStatus, Sex } from '@prisma/client'
import styles from './page.module.css'

interface QuickVisitForm {
  firstName: string
  lastName: string
  approximateAge: string
  sex: Sex | ''
  arrivalPath: ArrivalPath | ''
  status: VisitStatus | ''
  chiefComplaintCategory: string
  chiefComplaintText: string
  notes: string
}

export default function QuickVisitPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<QuickVisitForm>({
    firstName: '',
    lastName: '',
    approximateAge: '',
    sex: '',
    arrivalPath: '',
    status: '',
    chiefComplaintCategory: '',
    chiefComplaintText: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFieldChange = (field: keyof QuickVisitForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      // Validate required fields
      if (!formData.firstName || !formData.arrivalPath || !formData.status) {
        setError('Please fill in all required fields')
        return
      }

      const response = await fetch('/api/visits/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName || undefined,
          approximateAge: formData.approximateAge ? parseInt(formData.approximateAge) : undefined,
          sex: formData.sex || undefined,
          arrivalPath: formData.arrivalPath,
          status: formData.status,
          chiefComplaintCategory: formData.chiefComplaintCategory || null,
          chiefComplaintText: formData.chiefComplaintText || null,
          notes: formData.notes || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create visit')
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
          <h1>✓ Visit Created</h1>
          <p>Patient has been added with status: {formData.status}</p>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Quick Visit Creation</h1>
        <p className={styles.subtitle}>Trauma / Direct-to-Room / EMS</p>
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
            <strong>Use this form for trauma, EMS, or direct-to-room cases.</strong>
          </p>
          <p>Creates a visit immediately with minimal information. Full demographics can be completed later.</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">
                First Name / Alias <span className={styles.required}>*</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                placeholder="Required"
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
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="approximateAge">Approximate Age</label>
              <input
                id="approximateAge"
                type="number"
                min="0"
                max="150"
                value={formData.approximateAge}
                onChange={(e) => handleFieldChange('approximateAge', e.target.value)}
                placeholder="e.g., 45"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="sex">Sex</label>
              <select
                id="sex"
                value={formData.sex}
                onChange={(e) => handleFieldChange('sex', e.target.value)}
              >
                <option value="">Unknown</option>
                <option value={Sex.MALE}>Male</option>
                <option value={Sex.FEMALE}>Female</option>
                <option value={Sex.OTHER}>Other</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="arrivalPath">
                Arrival Path <span className={styles.required}>*</span>
              </label>
              <select
                id="arrivalPath"
                value={formData.arrivalPath}
                onChange={(e) => handleFieldChange('arrivalPath', e.target.value as ArrivalPath)}
                required
              >
                <option value="">Select...</option>
                <option value={ArrivalPath.WALK_IN}>Walk-In</option>
                <option value={ArrivalPath.EMS}>EMS / Ambulance</option>
                <option value={ArrivalPath.TRAUMA_DIRECT}>Trauma / Direct-to-Room</option>
                <option value={ArrivalPath.OTHER}>Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="status">
                Initial Status <span className={styles.required}>*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value as VisitStatus)}
                required
              >
                <option value="">Select...</option>
                <option value={VisitStatus.IN_TRIAGE}>In Triage</option>
                <option value={VisitStatus.ROOMED}>Roomed</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="chiefComplaintCategory">Chief Complaint (optional)</label>
            <select
              id="chiefComplaintCategory"
              value={formData.chiefComplaintCategory}
              onChange={(e) => handleFieldChange('chiefComplaintCategory', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="Trauma">Trauma</option>
              <option value="Chest Pain">Chest Pain</option>
              <option value="Shortness of Breath">Shortness of Breath</option>
              <option value="Stroke-like Symptoms">Stroke-like Symptoms</option>
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
              placeholder="Brief description..."
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
            />
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
              {submitting ? 'Creating...' : 'Create Visit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

