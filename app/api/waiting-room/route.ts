import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus, EwsType } from '@prisma/client'
import { calculateAge } from '@/lib/utils/age'

// Force dynamic rendering (uses searchParams)
export const dynamic = 'force-dynamic'

/**
 * Response type for waiting room patient
 */
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


/**
 * Calculate wait duration in minutes
 */
function calculateWaitDuration(arrivalTimestamp: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - arrivalTimestamp.getTime()
  return Math.floor(diffMs / (1000 * 60))
}

/**
 * GET /api/waiting-room
 * 
 * Returns all active visits with status WAITING or IN_TRIAGE, including:
 * - Patient basics (name, age, sex, phone)
 * - Provisional EWS level, score, and flags
 * - Arrival time and wait duration
 * - Verification status (ID, insurance, EPIC sync)
 * - Chief complaint
 * 
 * Results are sorted by EWS level (CRITICAL → LOW) then by arrival time.
 */
export async function GET(request: NextRequest) {
  try {
    // Optional query parameters
    const searchParams = request.nextUrl.searchParams
    const filterByComplaint = searchParams.get('complaint') // Filter by complaint category
    const sortBy = searchParams.get('sort') || 'risk' // 'risk' or 'arrival'

    // Check if Prisma is available (database connection)
    if (!prisma) {
      console.error('Prisma client not initialized')
      return NextResponse.json(
        { error: 'Database connection not available', patients: [], count: 0 },
        { status: 503 }
      )
    }

    // Fetch active visits (WAITING only - IN_TRIAGE means nurse has completed triage)
    // Once triage is complete, patient is removed from waiting room
    const visits = await prisma.visit.findMany({
      where: {
        status: VisitStatus.WAITING,
        ...(filterByComplaint && {
          intakeForm: {
            chiefComplaintCategory: filterByComplaint,
          },
        }),
      },
      include: {
        patientProfile: {
          include: {
            insurancePolicies: {
              where: { isPrimary: true },
              take: 1,
            },
            idDocuments: {
              take: 1,
            },
          },
        },
        intakeForm: {
          select: {
            chiefComplaintCategory: true,
            chiefComplaintText: true,
          },
        },
        ewsAssessments: {
          where: {
            type: EwsType.PROVISIONAL,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy:
        sortBy === 'arrival'
          ? [{ arrivalTimestamp: 'asc' }]
          : [
              // Sort by EWS level (we'll do this in-memory after fetching)
              { arrivalTimestamp: 'asc' },
            ],
    })

    // Map visits to waiting room response format
    const waitingRoomPatients: WaitingRoomPatient[] = visits.map((visit) => {
      const age = calculateAge(visit.patientProfile.dob)
      const waitDuration = calculateWaitDuration(visit.arrivalTimestamp)
      const provisionalEws = visit.ewsAssessments[0] || null

      // Determine verification status
      const hasIdDocument = visit.patientProfile.idDocuments.length > 0
      const hasInsurance = visit.patientProfile.insurancePolicies.length > 0
      const isEpicSynced = visit.epicEncounterId !== null

      return {
        visitId: visit.id,
        patient: {
          id: visit.patientProfile.id,
          firstName: visit.patientProfile.firstName,
          lastName: visit.patientProfile.lastName,
          dob: visit.patientProfile.dob.toISOString(),
          age,
          sex: visit.patientProfile.sex,
          phone: visit.patientProfile.phone,
        },
        arrivalTimestamp: visit.arrivalTimestamp.toISOString(),
        waitDurationMinutes: waitDuration,
        status: visit.status,
        notes: visit.notes,
        chiefComplaint: visit.intakeForm
          ? {
              category: visit.intakeForm.chiefComplaintCategory,
              text: visit.intakeForm.chiefComplaintText,
            }
          : null,
        ews: provisionalEws
          ? {
              score: provisionalEws.score,
              level: provisionalEws.level,
              flags:
                provisionalEws.flags && Array.isArray(provisionalEws.flags)
                  ? (provisionalEws.flags as string[])
                  : [],
            }
          : null,
        verification: {
          idVerified: hasIdDocument,
          insuranceVerified: hasInsurance,
          epicSynced: isEpicSynced,
        },
      }
    })

    // Sort by EWS level if sortBy is 'risk' (CRITICAL → HIGH → MODERATE → LOW)
    if (sortBy === 'risk') {
      const levelOrder: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MODERATE: 2,
        LOW: 3,
      }

      waitingRoomPatients.sort((a, b) => {
        const aLevel = a.ews?.level || 'LOW'
        const bLevel = b.ews?.level || 'LOW'
        const aOrder = levelOrder[aLevel] ?? 3
        const bOrder = levelOrder[bLevel] ?? 3

        if (aOrder !== bOrder) {
          return aOrder - bOrder
        }

        // If same EWS level, sort by arrival time (oldest first)
        return (
          new Date(a.arrivalTimestamp).getTime() - new Date(b.arrivalTimestamp).getTime()
        )
      })
    }

    return NextResponse.json({
      patients: waitingRoomPatients,
      count: waitingRoomPatients.length,
      filters: {
        status: [VisitStatus.WAITING], // Only WAITING patients shown in waiting room
        complaint: filterByComplaint || null,
        sortBy,
      },
    })
  } catch (error: any) {
    console.error('Error fetching waiting room:', error)
    // Return empty array instead of error to prevent app crash
    // This allows the app to work even if database isn't configured
    return NextResponse.json({
      error: error.message || 'Failed to fetch waiting room data',
      patients: [],
      count: 0,
      filters: {
        status: ['WAITING'],
        complaint: null,
        sortBy: 'risk',
      },
    }, { status: 200 }) // Return 200 with empty data instead of 500
  }
}

