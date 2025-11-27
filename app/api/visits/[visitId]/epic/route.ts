import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { epicIntegrationService } from '@/lib/epic/epicIntegrationService'
import { VisitStatus } from '@prisma/client'

/**
 * POST /api/visits/[visitId]/epic
 * 
 * Pushes visit data to EPIC via FHIR integration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const visitId = params.visitId

    // Fetch complete visit data with all relations
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

    // Sync patient profile to EPIC first (if not already synced)
    let epicPatientId = visit.patientProfile.epicPatientId
    if (!epicPatientId) {
      epicPatientId = await epicIntegrationService.syncPatientProfile(
        visit.patientProfile
      )

      // Update patient profile with EPIC patient ID
      await prisma.patientProfile.update({
        where: { id: visit.patientProfile.id },
        data: { epicPatientId },
      })
    }

    // Sync visit/encounter to EPIC
    const epicEncounterId = await epicIntegrationService.syncVisit(visit)

    // Update visit with EPIC encounter ID and mark as registered
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        epicEncounterId,
        status: VisitStatus.IN_TRIAGE, // Move to triage after EPIC sync
      },
    })

    return NextResponse.json({
      success: true,
      epicPatientId,
      epicEncounterId,
      message: 'Visit successfully synced to EPIC',
    })
  } catch (error: any) {
    console.error('Error syncing to EPIC:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync to EPIC',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

