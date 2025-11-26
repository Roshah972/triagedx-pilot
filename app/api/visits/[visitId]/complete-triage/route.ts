import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

/**
 * POST /api/visits/[visitId]/complete-triage
 * 
 * Marks a visit as triaged by the nurse.
 * This locks the pre-triage snapshot and removes the patient from the waiting room.
 * 
 * The nurse has completed their standard triage assessment (with hospital vitals equipment
 * and clinical evaluation). This endpoint simply marks the TriageDX pre-triage phase as complete.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const visitId = params.visitId
    const body = await request.json()

    // Get current visit to check status
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    // Check if already triaged
    if (visit.status === 'IN_TRIAGE' || visit.status === 'ROOMED') {
      return NextResponse.json(
        { error: 'Visit already marked as triaged' },
        { status: 400 }
      )
    }

    // Update visit status
    // IN_TRIAGE = Nurse has completed triage (patient may still be waiting for room)
    // ROOMED = Patient has been roomed
    const newStatus = (body.status as VisitStatus) || VisitStatus.IN_TRIAGE

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: newStatus,
        notes: body.notes || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Triage marked as complete',
      visitId,
      status: newStatus,
    })
  } catch (error) {
    console.error('Error completing triage:', error)
    return NextResponse.json(
      { error: 'Failed to complete triage' },
      { status: 500 }
    )
  }
}


