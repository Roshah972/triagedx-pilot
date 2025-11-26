'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { VisitStatus } from '@prisma/client'
import Logo from '@/components/Logo'
import styles from './page.module.css'

interface VisitData {
  id: string
  status: VisitStatus
  arrivalTimestamp: string
  patientProfile: {
    firstName: string
    lastName: string
    age: number
    sex: string
    phone: string | null
  }
  intakeForm: {
    intakeSource: string
    chiefComplaintCategory: string | null
    chiefComplaintText: string | null
    symptomAnswers: Record<string, unknown> | null
    riskFactors: Record<string, unknown> | null
    submittedAt: string
  } | null
  ewsAssessments: Array<{
    type: string
    level: string
    score: number | null
    flags: any
    createdAt: string
  }>
}

export default function TriagePage() {
  const params = useParams()
  const router = useRouter()
  const visitId = params.visitId as string

  const [visit, setVisit] = useState<VisitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch visit data
  useEffect(() => {
    const fetchVisit = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/visits/${visitId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch visit')
        }
        const data = await response.json()
        setVisit(data.visit)
      } catch (err: any) {
        setError(err.message || 'Failed to load visit')
      } finally {
        setLoading(false)
      }
    }

    if (visitId) {
      fetchVisit()
    }
  }, [visitId])

  const handleCompleteTriage = async () => {
    if (!visit) return

    // Confirm action
    const confirmed = window.confirm(
      'Mark this patient as triaged? This will lock the pre-triage snapshot and remove them from the waiting room.'
    )

    if (!confirmed) return

    try {
      setCompleting(true)
      setError(null)
      setSuccess(null)

      // Update visit status to IN_TRIAGE (nurse has completed their triage)
      const response = await fetch(`/api/visits/${visitId}/complete-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_TRIAGE', // Nurse has completed triage
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete triage')
      }

      setSuccess('Triage marked as complete. Patient removed from waiting room.')
      
      // Redirect to dashboard after 1.5 seconds
      setTimeout(() => {
        router.push('/staff/dashboard')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to complete triage')
    } finally {
      setCompleting(false)
    }
  }

  const provisionalEws = visit?.ewsAssessments.find((ews) => ews.type === 'PROVISIONAL')

  const getEwsBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return styles.badgeCritical
      case 'HIGH':
        return styles.badgeHigh
      case 'MODERATE':
        return styles.badgeModerate
      case 'LOW':
        return styles.badgeLow
      default:
        return styles.badgeLow
    }
  }

  const formatSymptomAnswer = (key: string, value: unknown): string => {
    if (value === true) return 'Yes'
    if (value === false) return 'No'
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    return '—'
  }

  const formatRiskFactor = (key: string): string => {
    // Convert snake_case to readable format
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading pre-triage summary...</div>
      </div>
    )
  }

  if (!visit) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Visit not found</div>
      </div>
    )
  }

  const isAlreadyTriaged = visit.status === 'IN_TRIAGE' || visit.status === 'ROOMED'

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="small" showText={false} className={styles.headerLogo} />
        <div className={styles.headerContent}>
          <h1>Pre-Triage Summary</h1>
          <p className={styles.headerSubtitle}>
            Patient self-reported information before nurse triage. This is a snapshot of registration data and automated risk assessment, not a clinical triage record.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/staff/dashboard')}
          className={styles.backButton}
        >
          ← Back to Dashboard
        </button>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {isAlreadyTriaged && (
        <div className={styles.infoBanner}>
          <strong>✓ Triage Complete</strong> - Nurse has completed standard triage assessment. This is a locked snapshot of pre-triage information collected before the nurse saw the patient.
        </div>
      )}

      <div className={styles.content}>
        {/* Print Button */}
        <div className={styles.actionBar}>
          <button
            type="button"
            onClick={() => window.print()}
            className={styles.printButton}
          >
            Print Summary
          </button>
        </div>

        {/* Patient Information */}
        <section className={styles.section}>
          <h2>Patient Information</h2>
          <div className={styles.patientInfo}>
            <div>
              <strong>Name:</strong> {visit.patientProfile.firstName}{' '}
              {visit.patientProfile.lastName}
            </div>
            <div>
              <strong>Age:</strong> {visit.patientProfile.age} ({visit.patientProfile.sex})
            </div>
            {visit.patientProfile.phone && (
              <div>
                <strong>Phone:</strong> {visit.patientProfile.phone}
              </div>
            )}
            {visit.intakeForm && (
              <div>
                <strong>Intake Source:</strong> {visit.intakeForm.intakeSource}
              </div>
            )}
            <div>
              <strong>Arrival Time:</strong>{' '}
              {new Date(visit.arrivalTimestamp).toLocaleString()}
            </div>
          </div>
        </section>

        {/* Chief Complaint */}
        {visit.intakeForm && visit.intakeForm.chiefComplaintCategory && (
          <section className={styles.section}>
            <h2>Chief Complaint</h2>
            <div className={styles.complaintInfo}>
              <div>
                <strong>Category:</strong> {visit.intakeForm.chiefComplaintCategory}
              </div>
            </div>
          </section>
        )}

        {/* Provisional EWS - Pre-Triage Risk Assessment */}
        {provisionalEws && (
          <section className={styles.section}>
            <h2>Pre-Triage Risk Assessment (EWS)</h2>
            <div className={styles.ewsDisplay}>
              <div className={styles.ewsBadgeContainer}>
                <span
                  className={`${styles.ewsBadge} ${getEwsBadgeClass(provisionalEws.level)}`}
                >
                  {provisionalEws.level}
                </span>
                {provisionalEws.score !== null && (
                  <span className={styles.ewsScore}>Score: {provisionalEws.score}</span>
                )}
              </div>
              {provisionalEws.flags && Array.isArray(provisionalEws.flags) && (
                <div className={styles.flags}>
                  <strong>Risk Flags:</strong>
                  <div className={styles.flagList}>
                    {provisionalEws.flags.map((flag: string, idx: number) => (
                      <span key={idx} className={styles.flag}>
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.ewsNote}>
                <em>
                  This is a provisional assessment based on patient self-reported symptoms. Nurse
                  will perform official triage with hospital vitals equipment and clinical assessment.
                  Self-reported vitals (if provided) are optional and not real-time monitoring.
                </em>
              </div>
            </div>
          </section>
        )}

        {/* Self-Reported Symptoms */}
        {visit.intakeForm?.symptomAnswers &&
          Object.keys(visit.intakeForm.symptomAnswers).length > 0 && (
            <section className={styles.section}>
              <h2>Self-Reported Symptoms</h2>
              <div className={styles.symptomsList}>
                {Object.entries(visit.intakeForm.symptomAnswers).map(([key, value]) => (
                  <div key={key} className={styles.symptomRow}>
                    <span className={styles.symptomLabel}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
                    </span>
                    <span className={styles.symptomValue}>{formatSymptomAnswer(key, value)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* Risk Factors */}
        {visit.intakeForm?.riskFactors &&
          Object.keys(visit.intakeForm.riskFactors).length > 0 && (
            <section className={styles.section}>
              <h2>Medical History / Risk Factors</h2>
              <div className={styles.riskFactorsList}>
                {Object.entries(visit.intakeForm.riskFactors)
                  .filter(([_, value]) => value === true)
                  .map(([key, _]) => (
                    <div key={key} className={styles.riskFactorItem}>
                      {formatRiskFactor(key)}
                    </div>
                  ))}
              </div>
            </section>
          )}

        {/* Complete Triage Button */}
        {!isAlreadyTriaged && (
          <section className={styles.section}>
            <div className={styles.completeTriageSection}>
              <h2>Complete Triage</h2>
              <p className={styles.completeTriageNote}>
                After you have completed your standard triage assessment with the patient (using
                hospital vitals equipment and your clinical evaluation), click below to mark this
                patient as triaged. This will:
              </p>
              <ul className={styles.completeTriageList}>
                <li>Lock this pre-triage snapshot</li>
                <li>Remove patient from waiting room</li>
                <li>Mark visit as triaged</li>
              </ul>
              <button
                type="button"
                onClick={handleCompleteTriage}
                disabled={completing}
                className={styles.completeTriageButton}
              >
                {completing ? 'Completing...' : '✓ Complete Triage'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
