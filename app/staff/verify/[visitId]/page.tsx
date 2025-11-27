'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sex, VisitStatus } from '@prisma/client'
import Logo from '@/components/Logo'
import styles from './page.module.css'

interface VisitData {
  id: string
  arrivalTimestamp: string
  status: VisitStatus
  epicEncounterId: string | null
  notes: string | null
  patientProfile: {
    id: string
    firstName: string
    lastName: string
    dob: string
    sex: Sex
    phone: string | null
    email: string | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    epicPatientId: string | null
    insurancePolicies: Array<{
      id: string
      providerName: string | null
      memberId: string | null
      groupId: string | null
      rawImageUrl: string | null
      isPrimary: boolean
    }>
    idDocuments: Array<{
      id: string
      docType: string
      imageUrl: string
    }>
  }
  intakeForm: {
    intakeSource: string
    chiefComplaintCategory: string | null
    chiefComplaintText: string | null
    submittedAt: string
  } | null
  ewsAssessments: Array<{
    level: string
    score: number | null
    flags: any
  }>
}

export default function VerifyPage() {
  const params = useParams()
  const router = useRouter()
  const visitId = params.visitId as string

  const [visit, setVisit] = useState<VisitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushingToEpic, setPushingToEpic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Editable form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    sex: '' as Sex | '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
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

        // Populate form with current data
        if (data.visit) {
          setFormData({
            firstName: data.visit.patientProfile.firstName,
            lastName: data.visit.patientProfile.lastName,
            dob: data.visit.patientProfile.dob.split('T')[0], // Format for date input
            sex: data.visit.patientProfile.sex,
            phone: data.visit.patientProfile.phone || '',
            email: data.visit.patientProfile.email || '',
            addressLine1: data.visit.patientProfile.addressLine1 || '',
            city: data.visit.patientProfile.city || '',
            state: data.visit.patientProfile.state || '',
            zipCode: data.visit.patientProfile.zipCode || '',
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

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleVerifyAndSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientProfileId: visit?.patientProfile.id,
          patientProfile: formData,
          status: VisitStatus.WAITING, // Keep as waiting until EPIC sync
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      setSuccess('Patient information verified and saved successfully')
      
      // Refresh visit data
      const refreshResponse = await fetch(`/api/visits/${visitId}`)
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setVisit(data.visit)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handlePushToEpic = async () => {
    try {
      setPushingToEpic(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/visits/${visitId}/epic`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to push to EPIC')
      }

      const result = await response.json()
      setSuccess(
        `Successfully synced to EPIC. Patient ID: ${result.epicPatientId}, Encounter ID: ${result.epicEncounterId}`
      )

      // Refresh visit data
      const refreshResponse = await fetch(`/api/visits/${visitId}`)
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setVisit(data.visit)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to push to EPIC')
    } finally {
      setPushingToEpic(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading visit details...</div>
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

  const hasIdDocument = visit.patientProfile.idDocuments.length > 0
  const hasInsurance = visit.patientProfile.insurancePolicies.length > 0
  const isEpicSynced = visit.epicEncounterId !== null

  const getEwsBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return styles.badgeCRITICAL
      case 'HIGH':
        return styles.badgeHIGH
      case 'MODERATE':
        return styles.badgeMODERATE
      case 'LOW':
        return styles.badgeLOW
      default:
        return styles.badgeLOW
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="small" showText={false} className={styles.headerLogo} />
        <div className={styles.headerContent}>
          <h1>Registrar Verification</h1>
          <p className={styles.headerSubtitle}>
            Full verification for insurance, address, and contact information. Nurses use "Quick Verify" for critical fields only.
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

        {/* Patient Demographics Section */}
        <section className={styles.section}>
          <h2>Patient Demographics</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">First Name *</label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName">Last Name *</label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="dob">Date of Birth *</label>
              <input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => handleFieldChange('dob', e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="sex">Sex *</label>
              <select
                id="sex"
                value={formData.sex}
                onChange={(e) => handleFieldChange('sex', e.target.value)}
                required
              >
                <option value="">Select...</option>
                <option value={Sex.MALE}>Male</option>
                <option value={Sex.FEMALE}>Female</option>
                <option value={Sex.OTHER}>Other</option>
                <option value={Sex.UNKNOWN}>Unknown</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="addressLine1">Address</label>
              <input
                id="addressLine1"
                type="text"
                value={formData.addressLine1}
                onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="state">State</label>
              <input
                id="state"
                type="text"
                value={formData.state}
                onChange={(e) => handleFieldChange('state', e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="zipCode">ZIP Code</label>
              <input
                id="zipCode"
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleFieldChange('zipCode', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Intake Summary Section */}
        {visit.intakeForm && (
          <section className={styles.section}>
            <h2>Intake Summary</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Intake Source:</span>
                <span className={styles.infoValue}>{visit.intakeForm.intakeSource}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Chief Complaint:</span>
                <span className={styles.infoValue}>
                  {visit.intakeForm.chiefComplaintCategory || 'Not specified'}
                </span>
              </div>
              {visit.intakeForm.chiefComplaintText && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Description:</span>
                  <span className={styles.infoValue}>
                    {visit.intakeForm.chiefComplaintText}
                  </span>
                </div>
              )}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Submitted:</span>
                <span className={styles.infoValue}>
                  {new Date(visit.intakeForm.submittedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* EWS Assessment Section */}
        {visit.ewsAssessments.length > 0 && (
          <section className={styles.section}>
            <h2>Early Warning Score</h2>
            <div className={styles.infoGrid}>
              {visit.ewsAssessments[0] && (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Risk Level:</span>
                    <span
                      className={`${styles.ewsBadge} ${getEwsBadgeClass(visit.ewsAssessments[0].level)}`}
                    >
                      {visit.ewsAssessments[0].level}
                    </span>
                  </div>
                  {visit.ewsAssessments[0].score !== null && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Score:</span>
                      <span className={styles.infoValue}>
                        {visit.ewsAssessments[0].score}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ID Documents Section */}
        <section className={styles.section}>
          <h2>ID Documents</h2>
          {hasIdDocument ? (
            <div className={styles.imageGrid}>
              {visit.patientProfile.idDocuments.map((doc) => (
                <div key={doc.id} className={styles.imageCard}>
                  <div className={styles.imageLabel}>{doc.docType}</div>
                  <img
                    src={doc.imageUrl}
                    alt={`${doc.docType} document`}
                    className={styles.documentImage}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No ID documents uploaded</div>
          )}
        </section>

        {/* Insurance Section */}
        <section className={styles.section}>
          <h2>Insurance Information</h2>
          {hasInsurance ? (
            <div className={styles.insuranceList}>
              {visit.patientProfile.insurancePolicies.map((insurance) => (
                <div key={insurance.id} className={styles.insuranceCard}>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Provider:</span>
                      <span className={styles.infoValue}>
                        {insurance.providerName || 'Not specified'}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Member ID:</span>
                      <span className={styles.infoValue}>
                        {insurance.memberId || 'Not provided'}
                      </span>
                    </div>
                    {insurance.groupId && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Group ID:</span>
                        <span className={styles.infoValue}>{insurance.groupId}</span>
                      </div>
                    )}
                    {insurance.isPrimary && (
                      <span className={styles.primaryBadge}>Primary</span>
                    )}
                  </div>
                  {insurance.rawImageUrl && (
                    <div className={styles.imageCard}>
                      <div className={styles.imageLabel}>Insurance Card</div>
                      <img
                        src={insurance.rawImageUrl}
                        alt="Insurance card"
                        className={styles.documentImage}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No insurance information provided</div>
          )}
        </section>

        {/* Visit Status Section */}
        <section className={styles.section}>
          <h2>Visit Status</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status:</span>
              <span className={styles.statusBadge}>{visit.status}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Arrival Time:</span>
              <span className={styles.infoValue}>
                {new Date(visit.arrivalTimestamp).toLocaleString()}
              </span>
            </div>
            {visit.epicEncounterId && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>EPIC Encounter ID:</span>
                <span className={styles.infoValue}>{visit.epicEncounterId}</span>
              </div>
            )}
            {visit.patientProfile.epicPatientId && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>EPIC Patient ID:</span>
                <span className={styles.infoValue}>
                  {visit.patientProfile.epicPatientId}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleVerifyAndSave}
            disabled={saving}
            className={styles.verifyButton}
          >
            {saving ? 'Saving...' : 'Verify & Save'}
          </button>
          <button
            type="button"
            onClick={handlePushToEpic}
            disabled={pushingToEpic || isEpicSynced}
            className={styles.epicButton}
          >
            {pushingToEpic
              ? 'Pushing to EPIC...'
              : isEpicSynced
              ? 'Already Synced to EPIC'
              : 'Push to EPIC'}
          </button>
        </div>
      </div>
    </div>
  )
}

