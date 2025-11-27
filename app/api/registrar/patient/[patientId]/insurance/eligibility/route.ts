import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EligibilityResult } from '@prisma/client'
import { z } from 'zod'

const EligibilityUpdateSchema = z.object({
  policyId: z.string(),
  changedByUserId: z.string(),
  result: z.enum(['NOT_RUN', 'ACTIVE', 'INACTIVE', 'ERROR']),
  notes: z.string().max(1000).optional().nullable(),
})

/**
 * POST /api/registrar/patient/[patientId]/insurance/eligibility
 * 
 * Manually set eligibility status (placeholder for future clearinghouse integration)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const patientId = params.patientId
    const body = EligibilityUpdateSchema.parse(await request.json())

    // Verify policy belongs to patient
    const policy = await prisma.insurancePolicy.findUnique({
      where: { id: body.policyId },
    })

    if (!policy || policy.patientProfileId !== patientId) {
      return NextResponse.json(
        { error: 'Insurance policy not found' },
        { status: 404 }
      )
    }

    // Update eligibility
    const updatedPolicy = await prisma.insurancePolicy.update({
      where: { id: body.policyId },
      data: {
        eligibilityResult: body.result as EligibilityResult,
        eligibilityLastCheckedAt: new Date(),
        eligibilityNotes: body.notes?.trim() || null,
      },
    })

    // Create audit log
    await prisma.insuranceAuditLog.create({
      data: {
        insurancePolicyId: body.policyId,
        changedByUserId: body.changedByUserId,
        field: 'eligibilityResult',
        oldValue: policy.eligibilityResult,
        newValue: body.result,
      },
    })

    return NextResponse.json({
      success: true,
      insurancePolicy: updatedPolicy,
    })
  } catch (error) {
    console.error('Error updating eligibility:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update eligibility' },
      { status: 500 }
    )
  }
}

