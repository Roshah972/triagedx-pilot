import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus, EwsType } from '@prisma/client'

// Force dynamic rendering (uses searchParams)
export const dynamic = 'force-dynamic'

/**
 * GET /api/visits
 * 
 * Returns a list of visits with optional filtering and sorting.
 * Used by staff dashboard to view patient queue.
 * 
 * Query parameters:
 * - status: Filter by visit status (WAITING, IN_TRIAGE, ROOMED, DISCHARGED, LWBS)
 * - sortBy: Sort by 'risk' (EWS level) or 'arrival' (arrival time)
 * - limit: Maximum number of results (default: 100)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const statusFilter = searchParams.get('status') as VisitStatus | null
    const sortBy = searchParams.get('sortBy') || 'risk'
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build where clause
    const where: any = {}
    if (statusFilter) {
      where.status = statusFilter
    }

    // Fetch visits with related data
    const visits = await prisma.visit.findMany({
      where,
      include: {
        patientProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dob: true,
            sex: true,
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
          : [{ arrivalTimestamp: 'asc' }], // Will sort by EWS in-memory if needed
      take: limit,
      skip: offset,
    })

    // If sorting by risk, sort in-memory by EWS level
    let sortedVisits = visits
    if (sortBy === 'risk') {
      const levelOrder: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MODERATE: 2,
        LOW: 3,
      }

      sortedVisits = [...visits].sort((a, b) => {
        const aLevel = a.ewsAssessments[0]?.level || 'LOW'
        const bLevel = b.ewsAssessments[0]?.level || 'LOW'
        const aOrder = levelOrder[aLevel] ?? 3
        const bOrder = levelOrder[bLevel] ?? 3

        if (aOrder !== bOrder) {
          return aOrder - bOrder
        }

        // If same EWS level, sort by arrival time (oldest first)
        return (
          a.arrivalTimestamp.getTime() - b.arrivalTimestamp.getTime()
        )
      })
    }

    // Format response
    const formattedVisits = sortedVisits.map((visit) => {
      const ews = visit.ewsAssessments[0]
      return {
        id: visit.id,
        patient: {
          id: visit.patientProfile.id,
          firstName: visit.patientProfile.firstName,
          lastName: visit.patientProfile.lastName,
          dob: visit.patientProfile.dob.toISOString(),
          sex: visit.patientProfile.sex,
        },
        arrivalTimestamp: visit.arrivalTimestamp.toISOString(),
        status: visit.status,
        chiefComplaint: visit.intakeForm
          ? {
              category: visit.intakeForm.chiefComplaintCategory,
              text: visit.intakeForm.chiefComplaintText,
            }
          : null,
        ews: ews
          ? {
              score: ews.score,
              level: ews.level,
              flags: ews.flags && Array.isArray(ews.flags) ? ews.flags : [],
            }
          : null,
      }
    })

    return NextResponse.json({
      visits: formattedVisits,
      count: formattedVisits.length,
      filters: {
        status: statusFilter,
        sortBy,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching visits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    )
  }
}

