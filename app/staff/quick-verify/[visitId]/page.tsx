'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import styles from './page.module.css'

interface EwsAssessment {
  type?: 'PROVISIONAL' | 'VERIFIED' | string
  level: string
  flags: any
}

interface VisitData {
  id: string
  patientProfile: {
    firstName: string
    lastName: string
    dob: string
    age: number
  }
  intakeForm: {
    chiefComplaintCategory: string | null
    chiefComplaintText: string | null
  } | null
  ewsAssessments: EwsAssessment[]
}

export default function QuickVerifyPage() {
  const params = useParams()
  const router = useRouter()
  const visitId = params.visitId as string

  const [visit, setVisit] = useState<VisitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verification checkboxes
  const [verified, setVerified] = useState({
    name: false,
    dob: false,
    complaint: false,
    redFlags: false,
  })

  // Corrections (if needed)
  const [corrections, setCorrections] = useState({
    firstName: '',
    lastName: '',
    dob: '',
  })

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
        // Pre-fill corrections with current values
        if (data.visit) {
          setCorrections({
            firstName: data.visit.patientProfile.firstName,
            lastName: data.visit.patientProfile.lastName,
            dob: data.visit.patientProfile.dob.split('T')[0],
          })
        }
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

  const handleQuickVerify = async () => {
    // Validate all critical fields are verified
    if (!verified.name || !verified.dob || !verified.complaint) {
      setError('Please verify all required fields (Name, DOB, Chief Complaint)')
      return
    }

    try {
      setVerifying(true)
      setError(null)

      const response = await fetch(`/api/visits/${visitId}/quick-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corrections: {
            firstName: corrections.firstName,
            lastName: corrections.lastName,
            dob: corrections.dob,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to verify and sync to Epic')
      }

      // Success - redirect to dashboard
      router.push('/staff/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to verify and sync to Epic')
    } finally {
      setVerifying(false)
    }
  }

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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading patient information...</div>
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

  // Safely get EWS assessment - handle case where type might not be in response
  const provisionalEws = visit.ewsAssessments.find((ews) => ews.type === 'PROVISIONAL') || null
  const hasRedFlags = provisionalEws?.flags && Array.isArray(provisionalEws.flags) && provisionalEws.flags.length > 0

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="small" showText={false} className={styles.headerLogo} />
        <div className={styles.headerContent}>
          <h1>Quick Verify for Epic Sync</h1>
          <p className={styles.subtitle}>
            Verify critical information (10-20 seconds). This will sync patient data to Epic.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/staff/dashboard')}
          className={styles.backButton}
        >
          Cancel
        </button>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.content}>
        {/* Critical Verification Checklist */}
        <section className={styles.section}>
          <h2>Verify Critical Information</h2>
          <p className={styles.sectionNote}>
            Check each box to confirm accuracy. Correct any errors before syncing to Epic.
          </p>

          <div className={styles.verifyList}>
            {/* Name Verification */}
            <div className={styles.verifyItem}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={verified.name}
                  onChange={(e) => setVerified({ ...verified, name: e.target.checked })}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>
                  <strong>Patient Name:</strong> {visit.patientProfile.firstName}{' '}
                  {visit.patientProfile.lastName}
                </span>
              </label>
              <div className={styles.corrections}>
                <input
                  type="text"
                  placeholder="First Name"
                  value={corrections.firstName}
                  onChange={(e) => setCorrections({ ...corrections, firstName: e.target.value })}
                  className={styles.correctionInput}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={corrections.lastName}
                  onChange={(e) => setCorrections({ ...corrections, lastName: e.target.value })}
                  className={styles.correctionInput}
                />
              </div>
            </div>

            {/* DOB Verification */}
            <div className={styles.verifyItem}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={verified.dob}
                  onChange={(e) => setVerified({ ...verified, dob: e.target.checked })}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>
                  <strong>Date of Birth:</strong>{' '}
                  {new Date(visit.patientProfile.dob).toLocaleDateString()} (Age:{' '}
                  {visit.patientProfile.age})
                </span>
              </label>
              <div className={styles.corrections}>
                <input
                  type="date"
                  value={corrections.dob}
                  onChange={(e) => setCorrections({ ...corrections, dob: e.target.value })}
                  className={styles.correctionInput}
                />
              </div>
            </div>

            {/* Chief Complaint Verification */}
            <div className={styles.verifyItem}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={verified.complaint}
                  onChange={(e) => setVerified({ ...verified, complaint: e.target.checked })}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>
                  <strong>Chief Complaint:</strong>{' '}
                  {visit.intakeForm?.chiefComplaintCategory || 'Not specified'}
                  {visit.intakeForm?.chiefComplaintText && (
                    <span className={styles.complaintText}>
                      {' '}
                      - {visit.intakeForm.chiefComplaintText}
                    </span>
                  )}
                </span>
              </label>
            </div>

            {/* Red Flags Verification */}
            {hasRedFlags && (
              <div className={styles.verifyItem}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={verified.redFlags}
                    onChange={(e) => setVerified({ ...verified, redFlags: e.target.checked })}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    <strong>Red Flags Reviewed:</strong>
                    <div className={styles.flags}>
                      {provisionalEws?.flags?.map((flag: string, idx: number) => (
                        <span key={idx} className={styles.flag}>
                          {flag}
                        </span>
                      ))}
                    </div>
                  </span>
                </label>
              </div>
            )}
          </div>
        </section>

        {/* EWS Display */}
        {provisionalEws && (
          <section className={styles.section}>
            <h2>Pre-Triage Risk Assessment</h2>
            <div className={styles.ewsDisplay}>
              <span
                className={`${styles.ewsBadge} ${getEwsBadgeClass(provisionalEws.level)}`}
              >
                {provisionalEws.level}
              </span>
              <p className={styles.ewsNote}>
                This is a provisional assessment based on patient self-reported symptoms. Nurse will
                perform official triage with hospital vitals equipment.
              </p>
            </div>
          </section>
        )}

        {/* Action Button */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleQuickVerify}
            disabled={verifying || !verified.name || !verified.dob || !verified.complaint}
            className={styles.verifyButton}
          >
            {verifying ? 'Syncing to Epic...' : '✓ Verify & Sync to Epic'}
          </button>
          <p className={styles.actionNote}>
            This will sync patient data to Epic. Registrar can verify insurance and address details
            separately if needed.
          </p>
        </div>
      </div>
    </div>
  )
}

