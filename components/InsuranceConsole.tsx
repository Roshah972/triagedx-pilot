'use client'

import { useState, useEffect } from 'react'
import { InsuranceStatus, PlanType, RelationshipType, EligibilityResult } from '@prisma/client'
import styles from './InsuranceConsole.module.css'

interface InsurancePolicy {
  id: string
  insuranceStatus: InsuranceStatus
  insuranceCarrierName: string | null
  payerId: string | null
  planName: string | null
  planType: PlanType | null
  policyId: string | null
  groupNumber: string | null
  subscriberFullName: string | null
  subscriberDOB: Date | null
  subscriberRelationshipToPatient: RelationshipType | null
  subscriberEmployerName: string | null
  guarantorFullName: string | null
  guarantorRelationshipToPatient: RelationshipType | null
  guarantorAddressLine1: string | null
  guarantorAddressLine2: string | null
  guarantorCity: string | null
  guarantorState: string | null
  guarantorZip: string | null
  guarantorPhoneNumber: string | null
  cardFrontImageUrl: string | null
  cardBackImageUrl: string | null
  eligibilityLastCheckedAt: Date | null
  eligibilityResult: EligibilityResult
  eligibilityNotes: string | null
  createdAt: Date
  updatedAt: Date
}

interface InsuranceConsoleProps {
  patientId: string
  visitId?: string
  currentUserId: string // For audit logging
  onUpdate?: () => void
}

const STATUS_COLORS: Record<InsuranceStatus, string> = {
  NOT_PROVIDED: '#6B7280',
  SELF_PAY: '#F59E0B',
  UNKNOWN: '#8B5CF6',
  MISSING_INFO: '#EF4444',
  PENDING_VERIFICATION: '#3B82F6',
  VERIFIED: '#10B981',
}

const STATUS_LABELS: Record<InsuranceStatus, string> = {
  NOT_PROVIDED: 'Not Provided',
  SELF_PAY: 'Self-Pay',
  UNKNOWN: 'Unknown',
  MISSING_INFO: 'Missing Info',
  PENDING_VERIFICATION: 'Pending Verification',
  VERIFIED: 'Verified',
}

const ELIGIBILITY_LABELS: Record<EligibilityResult, string> = {
  NOT_RUN: 'Not Run',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ERROR: 'Error',
}

export default function InsuranceConsole({ patientId, visitId, currentUserId, onUpdate }: InsuranceConsoleProps) {
  const [policy, setPolicy] = useState<InsurancePolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<InsurancePolicy>>({})
  const [imagePreview, setImagePreview] = useState<{ front: string | null; back: string | null }>({ front: null, back: null })

  useEffect(() => {
    fetchInsurance()
  }, [patientId])

  const fetchInsurance = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/registrar/patient/${patientId}/insurance`)
      if (!response.ok) {
        throw new Error('Failed to fetch insurance')
      }
      const data = await response.json()
      if (data.insurancePolicies && data.insurancePolicies.length > 0) {
        const primaryPolicy = data.insurancePolicies[0]
        setPolicy(primaryPolicy)
        setFormData(primaryPolicy)
        setImagePreview({
          front: primaryPolicy.cardFrontImageUrl,
          back: primaryPolicy.cardBackImageUrl,
        })
      } else {
        setPolicy(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load insurance information')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!policy) return

    try {
      setSaving(true)
      setError(null)

      const updatePayload = {
        policyId: policy.id,
        changedByUserId: currentUserId,
        ...formData,
        subscriberDOB: formData.subscriberDOB ? new Date(formData.subscriberDOB).toISOString() : null,
      }

      const response = await fetch(`/api/registrar/patient/${patientId}/insurance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update insurance')
      }

      await fetchInsurance()
      setEditing(false)
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleEligibilityUpdate = async (result: EligibilityResult, notes?: string) => {
    if (!policy) return

    try {
      const response = await fetch(`/api/registrar/patient/${patientId}/insurance/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: policy.id,
          changedByUserId: currentUserId,
          result,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update eligibility')
      }

      await fetchInsurance()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.message || 'Failed to update eligibility')
    }
  }

  const getStatusBadgeClass = (status: InsuranceStatus) => {
    return styles.statusBadge
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const maskPolicyId = (id: string | null) => {
    if (!id) return 'N/A'
    if (id.length <= 4) return id
    return `XXXX-${id.slice(-4)}`
  }

  if (loading) {
    return <div className={styles.loading}>Loading insurance information...</div>
  }

  if (!policy) {
    return (
      <div className={styles.emptyState}>
        <p>No insurance information available for this patient.</p>
      </div>
    )
  }

  return (
    <div className={styles.console}>
      <div className={styles.header}>
        <h2>Insurance & Billing</h2>
        <div className={styles.statusBadge} style={{ backgroundColor: STATUS_COLORS[policy.insuranceStatus] }}>
          {STATUS_LABELS[policy.insuranceStatus]}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Card Images */}
      {(policy.cardFrontImageUrl || policy.cardBackImageUrl) && (
        <div className={styles.section}>
          <h3>Insurance Card Images</h3>
          <div className={styles.imageGrid}>
            {policy.cardFrontImageUrl && (
              <div className={styles.imageContainer}>
                <img
                  src={policy.cardFrontImageUrl}
                  alt="Insurance card front"
                  onClick={() => window.open(policy.cardFrontImageUrl!, '_blank')}
                  className={styles.cardImage}
                />
                <span>Front</span>
              </div>
            )}
            {policy.cardBackImageUrl && (
              <div className={styles.imageContainer}>
                <img
                  src={policy.cardBackImageUrl}
                  alt="Insurance card back"
                  onClick={() => window.open(policy.cardBackImageUrl!, '_blank')}
                  className={styles.cardImage}
                />
                <span>Back</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan Details */}
      <div className={styles.section}>
        <h3>Plan Details</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Insurance Carrier *</label>
            {editing ? (
              <input
                type="text"
                value={formData.insuranceCarrierName || ''}
                onChange={(e) => setFormData({ ...formData, insuranceCarrierName: e.target.value })}
                className={styles.input}
              />
            ) : (
              <div className={styles.value}>{policy.insuranceCarrierName || 'N/A'}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Payer ID</label>
            {editing ? (
              <input
                type="text"
                value={formData.payerId || ''}
                onChange={(e) => setFormData({ ...formData, payerId: e.target.value })}
                className={styles.input}
              />
            ) : (
              <div className={styles.value}>{policy.payerId || 'N/A'}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Plan Name</label>
            {editing ? (
              <input
                type="text"
                value={formData.planName || ''}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                className={styles.input}
              />
            ) : (
              <div className={styles.value}>{policy.planName || 'N/A'}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Policy ID / Member ID *</label>
            {editing ? (
              <input
                type="text"
                value={formData.policyId || ''}
                onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                className={styles.input}
              />
            ) : (
              <div className={styles.value}>
                {policy.insuranceStatus === 'VERIFIED' ? policy.policyId : maskPolicyId(policy.policyId)}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Group Number</label>
            {editing ? (
              <input
                type="text"
                value={formData.groupNumber || ''}
                onChange={(e) => setFormData({ ...formData, groupNumber: e.target.value })}
                className={styles.input}
              />
            ) : (
              <div className={styles.value}>{policy.groupNumber || 'N/A'}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Plan Type</label>
            {editing ? (
              <select
                value={formData.planType || ''}
                onChange={(e) => setFormData({ ...formData, planType: e.target.value as PlanType })}
                className={styles.input}
              >
                <option value="">Select</option>
                <option value="PPO">PPO</option>
                <option value="HMO">HMO</option>
                <option value="EPO">EPO</option>
                <option value="POS">POS</option>
                <option value="MEDICARE">Medicare</option>
                <option value="MEDICAID">Medicaid</option>
                <option value="TRICARE">Tricare</option>
                <option value="OTHER">Other</option>
              </select>
            ) : (
              <div className={styles.value}>{policy.planType || 'N/A'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Subscriber Information */}
      <div className={styles.section}>
        <h3>Subscriber Information</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Subscriber Name *</label>
            {editing ? (
              <input
                type="text"
                value={formData.subscriberFullName || ''}
                onChange={(e) => setFormData({ ...formData, subscriberFullName: e.target.value })}
                className={styles.input}
              />
            ) : (
              <div className={styles.value}>{policy.subscriberFullName || 'N/A'}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Subscriber DOB *</label>
            {editing ? (
              <input
                type="date"
                value={formData.subscriberDOB ? new Date(formData.subscriberDOB).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, subscriberDOB: e.target.value ? new Date(e.target.value) : null })}
                className={styles.input}
              />
            ) : (
              <div className={styles.value}>{formatDate(policy.subscriberDOB)}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Relationship to Patient</label>
            {editing ? (
              <select
                value={formData.subscriberRelationshipToPatient || ''}
                onChange={(e) => setFormData({ ...formData, subscriberRelationshipToPatient: e.target.value as RelationshipType })}
                className={styles.input}
              >
                <option value="">Select</option>
                <option value="SELF">Self</option>
                <option value="PARENT">Parent</option>
                <option value="SPOUSE">Spouse</option>
                <option value="CHILD">Child</option>
                <option value="OTHER">Other</option>
              </select>
            ) : (
              <div className={styles.value}>{policy.subscriberRelationshipToPatient || 'N/A'}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Subscriber Employer</label>
            {editing ? (
              <input
                type="text"
                value={formData.subscriberEmployerName || ''}
                onChange={(e) => setFormData({ ...formData, subscriberEmployerName: e.target.value })}
                className={styles.input}
              />
            ) : (
              <div className={styles.value}>{policy.subscriberEmployerName || 'N/A'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Guarantor Information */}
      {(policy.guarantorFullName || editing) && (
        <div className={styles.section}>
          <h3>Guarantor Information</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Guarantor Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.guarantorFullName || ''}
                  onChange={(e) => setFormData({ ...formData, guarantorFullName: e.target.value })}
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{policy.guarantorFullName || 'N/A'}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Relationship to Patient</label>
              {editing ? (
                <select
                  value={formData.guarantorRelationshipToPatient || ''}
                  onChange={(e) => setFormData({ ...formData, guarantorRelationshipToPatient: e.target.value as RelationshipType })}
                  className={styles.input}
                >
                  <option value="">Select</option>
                  <option value="SELF">Self</option>
                  <option value="PARENT">Parent</option>
                  <option value="SPOUSE">Spouse</option>
                  <option value="CHILD">Child</option>
                  <option value="OTHER">Other</option>
                </select>
              ) : (
                <div className={styles.value}>{policy.guarantorRelationshipToPatient || 'N/A'}</div>
              )}
            </div>

            {editing && (
              <>
                <div className={styles.formGroup}>
                  <label>Guarantor Address</label>
                  <input
                    type="text"
                    value={formData.guarantorAddressLine1 || ''}
                    onChange={(e) => setFormData({ ...formData, guarantorAddressLine1: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.guarantorCity || ''}
                    onChange={(e) => setFormData({ ...formData, guarantorCity: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.guarantorState || ''}
                    onChange={(e) => setFormData({ ...formData, guarantorState: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Zip Code</label>
                  <input
                    type="text"
                    value={formData.guarantorZip || ''}
                    onChange={(e) => setFormData({ ...formData, guarantorZip: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.guarantorPhoneNumber || ''}
                    onChange={(e) => setFormData({ ...formData, guarantorPhoneNumber: e.target.value })}
                    className={styles.input}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Eligibility Check */}
      <div className={styles.section}>
        <h3>Eligibility Check</h3>
        <div className={styles.eligibilitySection}>
          <div className={styles.eligibilityStatus}>
            <span>Status: </span>
            <span className={styles.eligibilityBadge}>{ELIGIBILITY_LABELS[policy.eligibilityResult]}</span>
            {policy.eligibilityLastCheckedAt && (
              <span className={styles.eligibilityDate}>
                (as of {formatDate(policy.eligibilityLastCheckedAt)})
              </span>
            )}
          </div>
          {policy.eligibilityNotes && (
            <div className={styles.eligibilityNotes}>{policy.eligibilityNotes}</div>
          )}
          <div className={styles.eligibilityActions}>
            <button
              onClick={() => handleEligibilityUpdate('ACTIVE')}
              className={styles.eligibilityButton}
            >
              Mark as Active
            </button>
            <button
              onClick={() => handleEligibilityUpdate('INACTIVE')}
              className={styles.eligibilityButton}
            >
              Mark as Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Status Management */}
      <div className={styles.section}>
        <h3>Status Management</h3>
        <div className={styles.statusSection}>
          {editing ? (
            <select
              value={formData.insuranceStatus || policy.insuranceStatus}
              onChange={(e) => setFormData({ ...formData, insuranceStatus: e.target.value as InsuranceStatus })}
              className={styles.input}
            >
              <option value="NOT_PROVIDED">Not Provided</option>
              <option value="SELF_PAY">Self-Pay</option>
              <option value="UNKNOWN">Unknown</option>
              <option value="MISSING_INFO">Missing Info</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="VERIFIED">Verified</option>
            </select>
          ) : (
            <div className={styles.value}>{STATUS_LABELS[policy.insuranceStatus]}</div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        {editing ? (
          <>
            <button onClick={handleSave} disabled={saving} className={styles.saveButton}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setFormData(policy)
                setError(null)
              }}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className={styles.editButton}>
            Edit Insurance Information
          </button>
        )}
      </div>
    </div>
  )
}

