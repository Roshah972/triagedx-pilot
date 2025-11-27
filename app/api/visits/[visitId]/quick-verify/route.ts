import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { epicIntegrationService } from '@/lib/epic/epicIntegrationService'
import { VisitStatus } from '@prisma/client'

/**
 * POST /api/visits/[visitId]/quick-verify
 * 
 * Quick verification for nurses - verifies critical fields and syncs to Epic in one action.
 * 
 * This is the 10-20 second verification process that nurses use before clinical triage.
 * Nurse verifies: Name, DOB, Chief complaint, Red flag symptoms
 * 
 * After verification, automatically syncs to Epic.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const visitId = params.visitId
    const body = await request.json()

    // Get current visit with all relations needed for Epic sync
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patientProfile: {
          include: {
            insurancePolicies: true,
            idDocuments: true,
          },
        },
        intakeForm: true,
        ewsAssessments: {
          orderBy: { createdAt: 'desc' },
        },
        vitals: {
          orderBy: { recordedAt: 'desc' },
        },
      },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    // Update patient profile if corrections were made
    if (body.corrections) {
      const corrections = body.corrections
      await prisma.patientProfile.update({
        where: { id: visit.patientProfile.id },
        data: {
          firstName: corrections.firstName || visit.patientProfile.firstName,
          lastName: corrections.lastName || visit.patientProfile.lastName,
          dob: corrections.dob ? new Date(corrections.dob) : visit.patientProfile.dob,
        },
      })
    }

    // Sync patient profile to Epic first (if not already synced)
    let epicPatientId = visit.patientProfile.epicPatientId
    if (!epicPatientId) {
      epicPatientId = await epicIntegrationService.syncPatientProfile(
        visit.patientProfile
      )

      // Update patient profile with Epic patient ID
      await prisma.patientProfile.update({
        where: { id: visit.patientProfile.id },
        data: { epicPatientId },
      })
    }

    // Sync visit/encounter to Epic
    const epicEncounterId = await epicIntegrationService.syncVisit(visit)

    // Update visit with Epic encounter ID
    // Status remains WAITING until nurse completes clinical triage
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        epicEncounterId,
        notes: body.notes || visit.notes,
      },
    })

    return NextResponse.json({
      success: true,
      epicPatientId,
      epicEncounterId,
      message: 'Patient verified and synced to Epic',
    })
  } catch (error: any) {
    console.error('Error in quick verify:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify and sync to Epic',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

