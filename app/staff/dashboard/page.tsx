'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { EwsLevel, VisitStatus } from '@prisma/client'
import Logo from '@/components/Logo'
import { useTour } from '@/contexts/DemoTourContext'
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

interface WaitingRoomResponse {
  patients: WaitingRoomPatient[]
  count: number
  filters: {
    status: string[]
    complaint: string | null
    sortBy: string
  }
}

type SortField = 'ews' | 'arrival' | 'age'
type EwsFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'

// Configurable wait time threshold (in minutes) for highlighting
const LONG_WAIT_THRESHOLD_MINUTES = 30

// Complaint category labels
const COMPLAINT_LABELS: Record<string, string> = {
  CHEST_PAIN: 'Chest Pain',
  BREATHING: 'Breathing',
  ABDOMINAL_PAIN: 'Abdominal Pain',
  FEVER: 'Fever',
  NEURO: 'Neurological',
  TRAUMA: 'Trauma',
  PSYCH: 'Psychiatric',
  OTHER: 'Other',
}

const COMPLAINT_CATEGORIES = ['ALL', 'CHEST_PAIN', 'BREATHING', 'ABDOMINAL_PAIN', 'FEVER', 'NEURO', 'TRAUMA', 'PSYCH', 'OTHER'] as const
type ComplaintFilter = typeof COMPLAINT_CATEGORIES[number]

export default function StaffDashboard() {
  const router = useRouter()
  const { startTour, isActive } = useTour()
  const [patients, setPatients] = useState<WaitingRoomPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('ews')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [ewsFilter, setEwsFilter] = useState<EwsFilter>('ALL')
  const [complaintFilter, setComplaintFilter] = useState<ComplaintFilter>('ALL')
  const [waitTimeFilter, setWaitTimeFilter] = useState<boolean>(false)
  const [pedsFilter, setPedsFilter] = useState<boolean>(false)
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set())
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState<string>('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef<number>(0)

  // Fetch waiting room data
  const fetchWaitingRoom = async () => {
    try {
      setError(null)
      const complaintParam = complaintFilter !== 'ALL' ? `&complaint=${complaintFilter}` : ''
      const response = await fetch(`/api/waiting-room?sort=risk${complaintParam}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch waiting room data (${response.status})`)
      }
      const data: WaitingRoomResponse = await response.json()
      
      // Preserve scroll position
      if (scrollContainerRef.current) {
        scrollPositionRef.current = scrollContainerRef.current.scrollTop
      }

      setPatients(data.patients)

      // Restore scroll position after a brief delay
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPositionRef.current
        }
      }, 0)
    } catch (err: any) {
      console.error('Error fetching waiting room:', err)
      setError(err.message || 'Failed to load waiting room data')
    } finally {
      setLoading(false)
    }
  }

  // Complete triage handler
  const handleCompleteTriage = async (visitId: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(visitId))
    try {
      const response = await fetch(`/api/visits/${visitId}/complete-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: VisitStatus.IN_TRIAGE,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to complete triage')
      }
      // Refresh data - patient will be removed from waiting room
      await fetchWaitingRoom()
    } catch (err: any) {
      setError(err.message || 'Failed to complete triage')
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev)
        next.delete(visitId)
        return next
      })
    }
  }

  // Update status handler
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
      // Refresh data
      await fetchWaitingRoom()
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

  // Update notes handler
  const handleNotesUpdate = async (visitId: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(visitId))
    try {
      const response = await fetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue || null }),
      })
      if (!response.ok) {
        throw new Error('Failed to update notes')
      }
      setEditingNotes(null)
      setNotesValue('')
      // Refresh data
      await fetchWaitingRoom()
    } catch (err: any) {
      setError(err.message || 'Failed to update notes')
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev)
        next.delete(visitId)
        return next
      })
    }
  }

  // Start editing notes
  const handleStartEditingNotes = (visitId: string, currentNotes: string | null) => {
    setEditingNotes(visitId)
    setNotesValue(currentNotes || '')
  }

  // Initial fetch and refetch when filters change
  useEffect(() => {
    fetchWaitingRoom()
  }, [complaintFilter])

  // Polling for real-time updates (every 12 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWaitingRoom()
    }, 12000) // 12 seconds

    return () => clearInterval(interval)
  }, [complaintFilter])

  // Filter and sort patients
  const filteredAndSortedPatients = patients
    .filter((patient) => {
      // EWS filter
      if (ewsFilter !== 'ALL' && patient.ews?.level !== ewsFilter) {
        return false
      }
      // Wait time filter
      if (waitTimeFilter && patient.waitDurationMinutes < LONG_WAIT_THRESHOLD_MINUTES) {
        return false
      }
      // Peds filter (age < 18)
      if (pedsFilter && patient.patient.age >= 18) {
        return false
      }
      // Complaint category filter
      if (complaintFilter !== 'ALL') {
        if (patient.chiefComplaint?.category !== complaintFilter) {
          return false
        }
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'ews': {
          const levelOrder: Record<string, number> = {
            CRITICAL: 0,
            HIGH: 1,
            MODERATE: 2,
            LOW: 3,
          }
          const aLevel = a.ews?.level || 'LOW'
          const bLevel = b.ews?.level || 'LOW'
          comparison = (levelOrder[aLevel] ?? 3) - (levelOrder[bLevel] ?? 3)
          break
        }
        case 'arrival': {
          comparison =
            new Date(a.arrivalTimestamp).getTime() -
            new Date(b.arrivalTimestamp).getTime()
          break
        }
        case 'age': {
          comparison = a.patient.age - b.patient.age
          break
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getEwsBadgeClass = (level: string | undefined) => {
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
        return styles.badgeUnknown
    }
  }

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading && patients.length === 0) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading waiting room...</div>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header} data-tour-id="nurse-console">
        <Logo size="medium" className={styles.headerLogo} />
        <div className={styles.headerContent}>
          <h1>Staff Dashboard - Waiting Room</h1>
          <p className={styles.headerSubtitle}>
            Pre-triage snapshot view. Nurses perform official triage with hospital equipment and document in Epic.
          </p>
          <div className={styles.headerInfo}>
            <span className={styles.patientCount}>
              {filteredAndSortedPatients.length} patient
              {filteredAndSortedPatients.length !== 1 ? 's' : ''}
            </span>
            <span className={styles.lastUpdate}>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        {!isActive && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/check-in')}
              data-tour-id="checkin-entry"
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: 'var(--color-primary)',
                border: '2px solid var(--color-primary)',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              New Check-In
            </button>
            <button
              onClick={startTour}
              style={{
                padding: '8px 16px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Start Demo Tour
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('triagedx_demo_seen')
                  window.location.href = '/staff/dashboard?demo=1'
                }
              }}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: 'var(--muted-foreground)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
              title="Replay the demo tour"
            >
              Replay Demo
            </button>
          </div>
        )}
      </header>

      {/* Filters and Sorting */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          <label>Filter by Risk Level:</label>
          <div className={styles.filterButtons}>
            {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as EwsFilter[]).map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`${styles.filterButton} ${
                    ewsFilter === filter ? styles.filterButtonActive : ''
                  }`}
                  onClick={() => setEwsFilter(filter)}
                >
                  {filter}
                </button>
              )
            )}
          </div>
        </div>

        <div className={styles.filters}>
          <label>Filter by Complaint:</label>
          <div className={styles.filterButtons}>
            {COMPLAINT_CATEGORIES.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${styles.filterButton} ${
                  complaintFilter === filter ? styles.filterButtonActive : ''
                }`}
                onClick={() => setComplaintFilter(filter)}
              >
                {filter === 'ALL' ? 'All' : COMPLAINT_LABELS[filter] || filter}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filters}>
          <label>Wait Time:</label>
          <div className={styles.filterButtons}>
            <button
              type="button"
              className={`${styles.filterButton} ${
                waitTimeFilter ? styles.filterButtonActive : ''
              }`}
              onClick={() => setWaitTimeFilter(!waitTimeFilter)}
            >
              {waitTimeFilter ? '✓ ' : ''}Unseen &gt; 30 min
            </button>
          </div>
        </div>

        <div className={styles.filters}>
          <label>Patient Type:</label>
          <div className={styles.filterButtons}>
            <button
              type="button"
              className={`${styles.filterButton} ${
                pedsFilter ? styles.filterButtonActive : ''
              }`}
              onClick={() => setPedsFilter(!pedsFilter)}
            >
              {pedsFilter ? '✓ ' : ''}Peds (&lt; 18)
            </button>
          </div>
        </div>

        <div className={styles.sorting}>
          <label>Sort by:</label>
          <div className={styles.sortButtons}>
            {(['ews', 'arrival', 'age'] as SortField[]).map((field) => (
              <button
                key={field}
                type="button"
                className={`${styles.sortButton} ${
                  sortField === field ? styles.sortButtonActive : ''
                }`}
                onClick={() => handleSort(field)}
              >
                {field === 'ews' ? 'Risk Level' : field === 'arrival' ? 'Arrival Time' : 'Age'}
                {sortField === field && (
                  <span className={styles.sortIndicator}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Patient Grid */}
      <div
        ref={scrollContainerRef}
        className={styles.patientGrid}
        onScroll={() => {
          if (scrollContainerRef.current) {
            scrollPositionRef.current = scrollContainerRef.current.scrollTop
          }
        }}
      >
        {filteredAndSortedPatients.length === 0 ? (
          <div className={styles.emptyState}>
            No patients in waiting room matching current filters.
          </div>
        ) : (
          filteredAndSortedPatients.map((patient) => {
            const isLongWait = patient.waitDurationMinutes >= LONG_WAIT_THRESHOLD_MINUTES

            return (
              <div
                key={patient.visitId}
                data-tour-id={patient.visitId === 'new-patient' ? 'new-patient-highlight' : undefined}
                className={`${styles.patientCard} ${
                  isLongWait ? styles.patientCardLongWait : ''
                } ${styles.patientCardClickable}`}
                onClick={() => router.push(`/staff/triage/${patient.visitId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/staff/triage/${patient.visitId}`)
                  }
                }}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.patientName}>
                    {patient.patient.firstName} {patient.patient.lastName}
                  </div>
                  {patient.ews && (
                    <div
                      className={`${styles.ewsBadge} ${getEwsBadgeClass(patient.ews.level)}`}
                    >
                      {patient.ews.level}
                    </div>
                  )}
                </div>
                <div className={styles.preTriageBadge}>
                  Pre-Triage Snapshot
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Age:</span>
                    <span className={styles.cardValue}>
                      {patient.patient.age} ({patient.patient.sex})
                    </span>
                  </div>

                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Arrived:</span>
                    <span className={styles.cardValue}>
                      {new Date(patient.arrivalTimestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Wait Time:</span>
                    <span
                      className={`${styles.cardValue} ${
                        isLongWait ? styles.waitTimeLong : ''
                      }`}
                    >
                      {formatWaitTime(patient.waitDurationMinutes)}
                    </span>
                  </div>

                  {patient.chiefComplaint && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Complaint:</span>
                      <span className={styles.cardValue}>
                        {patient.chiefComplaint.category || 'Other'}
                      </span>
                    </div>
                  )}

                  {patient.chiefComplaint?.text && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Description:</span>
                      <span className={styles.cardValue}>
                        {patient.chiefComplaint.text}
                      </span>
                    </div>
                  )}

                  {patient.ews?.flags && patient.ews.flags.length > 0 && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Flags:</span>
                      <div className={styles.flags}>
                        {patient.ews.flags.map((flag, idx) => (
                          <span key={idx} className={styles.flag}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {patient.ews && patient.ews.score !== null && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>EWS Score:</span>
                      <span className={styles.cardValue}>{patient.ews.score}</span>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.verificationStatus}>
                    {patient.verification.idVerified && (
                      <span className={styles.verificationBadge}>ID ✓</span>
                    )}
                    {patient.verification.insuranceVerified && (
                      <span className={styles.verificationBadge}>Insurance ✓</span>
                    )}
                    {patient.verification.epicSynced && (
                      <span className={styles.verificationBadge}>EPIC ✓</span>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/staff/triage/${patient.visitId}`)
                      }}
                    >
                      Triage
                    </button>
                    {!patient.verification.epicSynced && (
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.actionButtonVerify}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/staff/quick-verify/${patient.visitId}`)
                        }}
                      >
                        Quick Verify
                      </button>
                    )}
                    {patient.verification.epicSynced && (
                      <span className={styles.syncedBadge}>✓ Synced</span>
                    )}
                    <div className={styles.statusBadge}>{patient.status}</div>
                  </div>
                </div>

                  {/* Quick Actions */}
                <div className={styles.quickActions} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.quickActionButtons}>
                    <button
                      type="button"
                      className={`${styles.quickActionButton} ${styles.quickActionButtonPrimary}`}
                      onClick={async () => {
                        const confirmed = window.confirm(
                          'Mark triage as complete? This will lock the pre-triage snapshot and remove the patient from the waiting room.'
                        )
                        if (confirmed) {
                          await handleCompleteTriage(patient.visitId)
                        }
                      }}
                      disabled={updatingStatus.has(patient.visitId)}
                    >
                      {updatingStatus.has(patient.visitId) ? '...' : 'Complete Triage'}
                    </button>
                    <button
                      type="button"
                      className={styles.quickActionButton}
                      onClick={() => handleStatusUpdate(patient.visitId, VisitStatus.ROOMED)}
                      disabled={updatingStatus.has(patient.visitId)}
                    >
                      {updatingStatus.has(patient.visitId) ? '...' : 'Roomed'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.quickActionButton} ${styles.quickActionButtonDanger}`}
                      onClick={() => handleStatusUpdate(patient.visitId, VisitStatus.LWBS)}
                      disabled={updatingStatus.has(patient.visitId)}
                    >
                      {updatingStatus.has(patient.visitId) ? '...' : 'LWBS'}
                    </button>
                  </div>
                  <div className={styles.notesSection}>
                    {editingNotes === patient.visitId ? (
                      <div className={styles.notesEditor}>
                        <textarea
                          className={styles.notesInput}
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes..."
                          rows={2}
                        />
                        <div className={styles.notesActions}>
                          <button
                            type="button"
                            className={styles.notesSaveButton}
                            onClick={() => handleNotesUpdate(patient.visitId)}
                            disabled={updatingStatus.has(patient.visitId)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.notesCancelButton}
                            onClick={() => {
                              setEditingNotes(null)
                              setNotesValue('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : patient.notes ? (
                      <div className={styles.notesDisplay}>
                        <div className={styles.notesText}>{patient.notes}</div>
                        <button
                          type="button"
                          className={styles.notesEditButton}
                          onClick={() => handleStartEditingNotes(patient.visitId, patient.notes)}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.notesButton}
                        onClick={() => handleStartEditingNotes(patient.visitId, null)}
                      >
                        + Add Notes
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

