'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VisitStatus } from '@prisma/client'
import Logo from '@/components/Logo'
import { calculateAge } from '@/lib/utils/age'
import styles from './page.module.css'

interface WaitingRoomPatient {
  visitId: string
  patient: {
    id: string
    firstName: string
    lastName: string
    dob: string
    age: number
    sex: string
    phone: string | null
  }
  arrivalTimestamp: string
  waitDurationMinutes: number
  status: string
  notes: string | null
  chiefComplaint: {
    category: string | null
    text: string | null
  } | null
  ews: {
    score: number | null
    level: string
    flags: string[]
  } | null
  verification: {
    idVerified: boolean
    insuranceVerified: boolean
    epicSynced: boolean
  }
}

interface VisitDetail extends WaitingRoomPatient {
  vitals?: {
    heartRate: number | null
    bloodPressureSystolic: number | null
    bloodPressureDiastolic: number | null
    respirations: number | null
    temperature: number | null
    spo2: number | null
    recordedAt: string
  } | null
  intakeForm?: {
    symptomAnswers: Record<string, any> | null
    riskFactors: Record<string, any> | null
  } | null
  auditTrail?: Array<{
    timestamp: string
    event: string
    description: string
  }>
}

interface WaitingRoomResponse {
  patients: WaitingRoomPatient[]
  count: number
}

export default function StaffDashboard() {
  const router = useRouter()
  const [patients, setPatients] = useState<WaitingRoomPatient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<VisitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set())
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [pulsingCards, setPulsingCards] = useState<Set<string>>(new Set())

  // Fetch waiting room data
  const fetchWaitingRoom = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/waiting-room?sort=risk`)
      if (!response.ok) {
        throw new Error(`Failed to fetch waiting room data (${response.status})`)
      }
      const data: WaitingRoomResponse = await response.json()
      
      // Check for EWS changes and trigger pulse animation
      setPatients((prevPatients) => {
        const newPulsing = new Set<string>()
        data.patients.forEach((newPatient) => {
          const oldPatient = prevPatients.find(p => p.visitId === newPatient.visitId)
          if (oldPatient) {
            const oldScore = oldPatient.ews?.score ?? null
            const newScore = newPatient.ews?.score ?? null
            const oldLevel = oldPatient.ews?.level ?? null
            const newLevel = newPatient.ews?.level ?? null
            
            // Pulse if EWS jumped to yellow or red
            if ((oldScore === null || oldScore < 4) && (newScore !== null && newScore >= 4)) {
              newPulsing.add(newPatient.visitId)
            }
            if (oldLevel !== 'CRITICAL' && newLevel === 'CRITICAL') {
              newPulsing.add(newPatient.visitId)
            }
          }
        })
        
        if (newPulsing.size > 0) {
          setPulsingCards(newPulsing)
          setTimeout(() => setPulsingCards(new Set()), 1000)
        }
        
        return data.patients
      })
    } catch (err: any) {
      console.error('Error fetching waiting room:', err)
      setError(err.message || 'Failed to load waiting room data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch detailed patient data
  const fetchPatientDetail = async (visitId: string) => {
    try {
      const response = await fetch(`/api/visits/${visitId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch patient details')
      }
      const { visit } = await response.json()
      
      // Build audit trail
      const auditTrail = [
        {
          timestamp: visit.arrivalTimestamp,
          event: 'ARRIVED',
          description: 'Patient arrived and completed intake',
        },
        {
          timestamp: visit.createdAt,
          event: 'SUBMITTED',
          description: 'Intake form submitted',
        },
      ]
      
      if (visit.ewsAssessments && visit.ewsAssessments.length > 0) {
        visit.ewsAssessments.forEach((ews: any) => {
          auditTrail.push({
            timestamp: ews.createdAt,
            event: 'EWS_ASSESSED',
            description: `${ews.type === 'PROVISIONAL' ? 'Provisional' : 'Verified'} EWS: ${ews.level} (${ews.score})`,
          })
        })
      }
      
      if (visit.vitals && visit.vitals.length > 0) {
        visit.vitals.forEach((vital: any) => {
          auditTrail.push({
            timestamp: vital.recordedAt,
            event: 'VITALS_RECORDED',
            description: 'Vitals recorded',
          })
        })
      }
      
      if (visit.updatedAt !== visit.createdAt) {
        auditTrail.push({
          timestamp: visit.updatedAt,
          event: 'UPDATED',
          description: 'Visit information updated',
        })
      }

      const dobDate = typeof visit.patientProfile.dob === 'string' 
        ? new Date(visit.patientProfile.dob) 
        : visit.patientProfile.dob
      const age = calculateAge(dobDate)
      
      const detail: VisitDetail = {
        visitId: visit.id,
        patient: {
          id: visit.patientProfile.id,
          firstName: visit.patientProfile.firstName,
          lastName: visit.patientProfile.lastName,
          dob: visit.patientProfile.dob,
          age: age,
          sex: visit.patientProfile.sex,
          phone: visit.patientProfile.phone,
        },
        arrivalTimestamp: visit.arrivalTimestamp,
        waitDurationMinutes: 0,
        status: visit.status,
        notes: visit.notes,
        chiefComplaint: visit.intakeForm
          ? {
              category: visit.intakeForm.chiefComplaintCategory,
              text: visit.intakeForm.chiefComplaintText,
            }
          : null,
        ews: visit.ewsAssessments && visit.ewsAssessments.length > 0
          ? {
              score: visit.ewsAssessments[0].score,
              level: visit.ewsAssessments[0].level,
              flags: visit.ewsAssessments[0].flags || [],
            }
          : null,
        verification: {
          idVerified: visit.patientProfile.idDocuments?.length > 0 || false,
          insuranceVerified: visit.patientProfile.insurancePolicies?.length > 0 || false,
          epicSynced: visit.epicEncounterId !== null,
        },
        vitals: visit.vitals && visit.vitals.length > 0
          ? {
              heartRate: visit.vitals[0].heartRate,
              bloodPressureSystolic: visit.vitals[0].bloodPressureSystolic,
              bloodPressureDiastolic: visit.vitals[0].bloodPressureDiastolic,
              respirations: visit.vitals[0].respirations,
              temperature: visit.vitals[0].temperature,
              spo2: visit.vitals[0].spo2,
              recordedAt: visit.vitals[0].recordedAt,
            }
          : null,
        intakeForm: visit.intakeForm
          ? {
              symptomAnswers: visit.intakeForm.symptomAnswers as Record<string, any> | null,
              riskFactors: visit.intakeForm.riskFactors as Record<string, any> | null,
            }
          : undefined,
        auditTrail: auditTrail.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      }
      
      setSelectedPatient(detail)
    } catch (err: any) {
      console.error('Error fetching patient detail:', err)
      setError(err.message || 'Failed to load patient details')
    }
  }

  // Handle patient card click
  const handlePatientClick = (patient: WaitingRoomPatient) => {
    fetchPatientDetail(patient.visitId)
  }

  // Handle status update
  const handleStatusUpdate = async (visitId: string, status: VisitStatus) => {
    setUpdatingStatus((prev) => new Set(prev).add(visitId))
    try {
      const response = await fetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        throw new Error('Failed to update status')
      }
      await fetchWaitingRoom()
      if (selectedPatient?.visitId === visitId) {
        await fetchPatientDetail(visitId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status')
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev)
        next.delete(visitId)
        return next
      })
    }
  }

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(`.${styles.userMenu}`)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  // Initial fetch and polling
  useEffect(() => {
    fetchWaitingRoom()
    const interval = setInterval(() => {
      fetchWaitingRoom()
      if (selectedPatient) {
        fetchPatientDetail(selectedPatient.visitId)
      }
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [selectedPatient])

  // Get EWS color
  const getEwsColor = (score: number | null, level: string | null) => {
    if (score === null) return '#E5E7EB' // Gray for no score
    if (score >= 7) return '#DC2626' // Red
    if (score >= 4) return '#F59E0B' // Yellow
    return '#10B981' // Green
  }

  // Get status badge text
  const getStatusBadge = (status: string) => {
    if (status === 'WAITING') return 'NEW'
    if (status === 'IN_TRIAGE') return 'UPDATED'
    return status
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Check if vitals are abnormal
  const isAbnormalVital = (value: number | null, type: string) => {
    if (value === null) return false
    switch (type) {
      case 'hr':
        return value < 60 || value > 100
      case 'rr':
        return value < 12 || value > 20
      case 'spo2':
        return value < 95
      case 'temp':
        return value < 97 || value > 99.5
      case 'bp':
        return false // Would need systolic/diastolic separately
      default:
        return false
    }
  }

  if (loading && patients.length === 0) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      {/* Top Navigation Bar */}
      <nav className={styles.navBar}>
        <div className={styles.navLeft}>
          <Logo size="small" />
        </div>
        <div className={styles.navCenter}></div>
        <div className={styles.navRight}>
          <div className={styles.userMenu}>
            <button
              className={styles.userAvatar}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="User menu"
            >
              RN
            </button>
            {userMenuOpen && (
              <div className={styles.userDropdown}>
                <button className={styles.dropdownItem}>Profile</button>
                <button className={styles.dropdownItem} onClick={() => router.push('/login')}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Grid Layout */}
      <div className={styles.mainGrid}>
        {/* Left Panel: Incoming Patients */}
        <div className={styles.patientList}>
          <div className={styles.patientListHeader}>
            <h2>Incoming Patients</h2>
            <span className={styles.patientCount}>{patients.length}</span>
          </div>
          
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.patientCards}>
            {patients.length === 0 ? (
              <div className={styles.emptyState}>No patients in waiting room</div>
            ) : (
              patients.map((patient) => {
                const ewsScore = patient.ews?.score ?? null
                const ewsLevel = patient.ews?.level ?? null
                const ewsColor = getEwsColor(ewsScore, ewsLevel)
                const isSelected = selectedPatient?.visitId === patient.visitId
                
                const isPulsing = pulsingCards.has(patient.visitId)
                
                return (
                  <div
                    key={patient.visitId}
                    className={`${styles.patientCard} ${isSelected ? styles.patientCardSelected : ''} ${isPulsing ? styles.pulse : ''}`}
                    onClick={() => handlePatientClick(patient)}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.cardName}>
                        {patient.patient.firstName} {patient.patient.lastName}
                      </div>
                      <div
                        className={styles.ewsTile}
                        style={{ backgroundColor: ewsColor }}
                      >
                        {ewsScore !== null ? ewsScore : '—'}
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardInfo}>
                        {patient.patient.age} {patient.patient.sex}
                      </div>
                      <div className={styles.cardComplaint}>
                        {patient.chiefComplaint?.text || patient.chiefComplaint?.category || 'No complaint'}
                      </div>
                      <div className={styles.cardFooter}>
                        <span className={styles.cardTime}>
                          {formatTime(patient.arrivalTimestamp)}
                        </span>
                        <span className={styles.statusBadge}>
                          {getStatusBadge(patient.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Panel: Patient Detail Drawer */}
        {selectedPatient && (
          <div className={styles.detailDrawer}>
            <div className={styles.drawerHeader}>
              <div>
                <h3>
                  {selectedPatient.patient.firstName} {selectedPatient.patient.lastName}
                </h3>
                <div className={styles.drawerSubheader}>
                  {selectedPatient.patient.age} {selectedPatient.patient.sex}
                </div>
              </div>
              <div
                className={styles.drawerEwsBadge}
                style={{
                  backgroundColor: getEwsColor(
                    selectedPatient.ews?.score ?? null,
                    selectedPatient.ews?.level ?? null
                  ),
                }}
              >
                EWS {selectedPatient.ews?.score ?? '—'}
              </div>
              <button
                className={styles.drawerClose}
                onClick={() => setSelectedPatient(null)}
                aria-label="Close drawer"
              >
                ×
              </button>
            </div>

            <div className={styles.drawerContent}>
              {/* Section 1: Vitals Summary */}
              <section className={styles.drawerSection}>
                <h4>Vitals Summary</h4>
                <div className={styles.vitalsGrid}>
                  <div className={styles.vitalItem}>
                    <span className={styles.vitalLabel}>HR</span>
                    <span
                      className={`${styles.vitalValue} ${
                        isAbnormalVital(selectedPatient.vitals?.heartRate ?? null, 'hr')
                          ? styles.vitalAbnormal
                          : ''
                      }`}
                    >
                      {selectedPatient.vitals?.heartRate ?? '—'} bpm
                    </span>
                  </div>
                  <div className={styles.vitalItem}>
                    <span className={styles.vitalLabel}>RR</span>
                    <span
                      className={`${styles.vitalValue} ${
                        isAbnormalVital(selectedPatient.vitals?.respirations ?? null, 'rr')
                          ? styles.vitalAbnormal
                          : ''
                      }`}
                    >
                      {selectedPatient.vitals?.respirations ?? '—'} /min
                    </span>
                  </div>
                  <div className={styles.vitalItem}>
                    <span className={styles.vitalLabel}>SpO2</span>
                    <span
                      className={`${styles.vitalValue} ${
                        isAbnormalVital(selectedPatient.vitals?.spo2 ?? null, 'spo2')
                          ? styles.vitalAbnormal
                          : ''
                      }`}
                    >
                      {selectedPatient.vitals?.spo2 ? `${selectedPatient.vitals.spo2}%` : '—'}
                    </span>
                  </div>
                  <div className={styles.vitalItem}>
                    <span className={styles.vitalLabel}>Temp</span>
                    <span
                      className={`${styles.vitalValue} ${
                        isAbnormalVital(selectedPatient.vitals?.temperature ?? null, 'temp')
                          ? styles.vitalAbnormal
                          : ''
                      }`}
                    >
                      {selectedPatient.vitals?.temperature
                        ? `${selectedPatient.vitals.temperature}°F`
                        : '—'}
                    </span>
                  </div>
                  <div className={styles.vitalItem}>
                    <span className={styles.vitalLabel}>BP</span>
                    <span className={styles.vitalValue}>
                      {selectedPatient.vitals?.bloodPressureSystolic &&
                      selectedPatient.vitals?.bloodPressureDiastolic
                        ? `${selectedPatient.vitals.bloodPressureSystolic}/${selectedPatient.vitals.bloodPressureDiastolic}`
                        : '—'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 2: Symptoms / CC */}
              <section className={styles.drawerSection}>
                <h4>Symptoms / Chief Complaint</h4>
                <div className={styles.complaintText}>
                  {selectedPatient.chiefComplaint?.text || 'No complaint description provided'}
                </div>
                {selectedPatient.chiefComplaint?.category && (
                  <div className={styles.complaintCategory}>
                    Category: {selectedPatient.chiefComplaint.category}
                  </div>
                )}
              </section>

              {/* Section 3: Auto-Risk Flags */}
              <section className={styles.drawerSection}>
                <h4>Auto-Risk Flags</h4>
                <ul className={styles.riskFlags}>
                  {selectedPatient.ews?.flags && selectedPatient.ews.flags.length > 0 ? (
                    selectedPatient.ews.flags.map((flag, idx) => (
                      <li key={idx} className={styles.riskFlag}>
                        {flag}
                      </li>
                    ))
                  ) : (
                    <li className={styles.noFlags}>No risk flags identified</li>
                  )}
                </ul>
              </section>

              {/* Section 4: Nurse Actions */}
              <section className={styles.drawerSection}>
                <h4>Nurse Actions</h4>
                <div className={styles.actionButtons}>
                  <button
                    className={styles.actionButton}
                    onClick={() => router.push(`/staff/triage/${selectedPatient.visitId}`)}
                  >
                    Bring to Triage
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleStatusUpdate(selectedPatient.visitId, VisitStatus.IN_TRIAGE)}
                    disabled={updatingStatus.has(selectedPatient.visitId)}
                  >
                    {updatingStatus.has(selectedPatient.visitId) ? '...' : 'Mark Reviewed'}
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => router.push(`/staff/verify/${selectedPatient.visitId}`)}
                  >
                    Send to RN
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                    onClick={() => handleStatusUpdate(selectedPatient.visitId, VisitStatus.LWBS)}
                    disabled={updatingStatus.has(selectedPatient.visitId)}
                  >
                    {updatingStatus.has(selectedPatient.visitId) ? '...' : 'Dismiss'}
                  </button>
                </div>
              </section>

              {/* Section 5: Audit Trail */}
              <section className={styles.drawerSection}>
                <h4>Audit Trail</h4>
                <div className={styles.auditTrail}>
                  {selectedPatient.auditTrail && selectedPatient.auditTrail.length > 0 ? (
                    selectedPatient.auditTrail.map((entry, idx) => (
                      <div key={idx} className={styles.auditEntry}>
                        <span className={styles.auditTime}>
                          {formatTime(entry.timestamp)}
                        </span>
                        <span className={styles.auditEvent}>{entry.event}</span>
                        <span className={styles.auditDescription}>{entry.description}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noAudit}>No audit trail available</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}








