import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

/**
 * GET /api/visits/[visitId]
 * 
 * Returns detailed visit information for registrar verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const visitId = params.visitId

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patientProfile: {
          include: {
            insuranceProfiles: true,
            idDocuments: true,
          },
        },
        intakeForm: true,
        ewsAssessments: {
          orderBy: { createdAt: 'desc' },
        },
        vitals: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    return NextResponse.json({ visit })
  } catch (error) {
    console.error('Error fetching visit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visit details' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/visits/[visitId]
 * 
 * Updates visit and patient profile information (registrar verification)
 * Also supports quick status updates (status-only, notes-only, or both)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const visitId = params.visitId
    const body = await request.json()

    // Update patient profile if provided
    if (body.patientProfile && body.patientProfileId) {
      await prisma.patientProfile.update({
        where: { id: body.patientProfileId },
        data: {
          firstName: body.patientProfile.firstName,
          lastName: body.patientProfile.lastName,
          dob: body.patientProfile.dob ? new Date(body.patientProfile.dob) : undefined,
          sex: body.patientProfile.sex,
          phone: body.patientProfile.phone ?? null,
          email: body.patientProfile.email ?? null,
          addressLine1: body.patientProfile.addressLine1 ?? null,
          addressLine2: body.patientProfile.addressLine2 ?? null,
          city: body.patientProfile.city ?? null,
          state: body.patientProfile.state ?? null,
          zipCode: body.patientProfile.zipCode ?? null,
        },
      })
    }

    // Update visit status and/or notes (supports quick updates)
    const updateData: any = {}
    if (body.status !== undefined) {
      updateData.status = body.status as VisitStatus
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes || null
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.visit.update({
        where: { id: visitId },
        data: updateData,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating visit:', error)
    return NextResponse.json(
      { error: 'Failed to update visit' },
      { status: 500 }
    )
  }
}

