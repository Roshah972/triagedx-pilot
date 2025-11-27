import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InsuranceStatus, PlanType, RelationshipType, EligibilityResult } from '@prisma/client'
import { z } from 'zod'

/**
 * Schema for registrar insurance update
 */
const InsuranceUpdateSchema = z.object({
  insuranceStatus: z.enum(['NOT_PROVIDED', 'SELF_PAY', 'UNKNOWN', 'MISSING_INFO', 'PENDING_VERIFICATION', 'VERIFIED']).optional(),
  insuranceCarrierName: z.string().max(200).optional().nullable(),
  payerId: z.string().max(100).optional().nullable(),
  planName: z.string().max(200).optional().nullable(),
  planType: z.enum(['PPO', 'HMO', 'EPO', 'POS', 'MEDICARE', 'MEDICAID', 'TRICARE', 'OTHER']).optional().nullable(),
  policyId: z.string().max(100).optional().nullable(),
  groupNumber: z.string().max(100).optional().nullable(),
  subscriberFullName: z.string().max(200).optional().nullable(),
  subscriberDOB: z.string().datetime().optional().nullable(),
  subscriberRelationshipToPatient: z.enum(['SELF', 'PARENT', 'SPOUSE', 'CHILD', 'OTHER']).optional().nullable(),
  subscriberEmployerName: z.string().max(200).optional().nullable(),
  guarantorFullName: z.string().max(200).optional().nullable(),
  guarantorRelationshipToPatient: z.enum(['SELF', 'PARENT', 'SPOUSE', 'CHILD', 'OTHER']).optional().nullable(),
  guarantorAddressLine1: z.string().max(200).optional().nullable(),
  guarantorAddressLine2: z.string().max(200).optional().nullable(),
  guarantorCity: z.string().max(100).optional().nullable(),
  guarantorState: z.string().max(50).optional().nullable(),
  guarantorZip: z.string().max(20).optional().nullable(),
  guarantorPhoneNumber: z.string().max(20).optional().nullable(),
  cardFrontImageUrl: z.string().url().optional().nullable(),
  cardBackImageUrl: z.string().url().optional().nullable(),
})

type InsuranceUpdateRequest = z.infer<typeof InsuranceUpdateSchema>

/**
 * Helper to create audit log entries for changed fields
 */
async function createAuditLogs(
  policyId: string,
  changedByUserId: string,
  oldData: any,
  newData: any,
  fieldsToTrack: string[]
) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

  for (const field of fieldsToTrack) {
    const oldValue = oldData[field]
    const newValue = newData[field]
    
    // Compare values (handle dates specially)
    if (oldValue instanceof Date && newValue instanceof Date) {
      if (oldValue.getTime() !== newValue.getTime()) {
        changes.push({
          field,
          oldValue: oldValue.toISOString(),
          newValue: newValue.toISOString(),
        })
      }
    } else if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
        newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
      })
    }
  }

  // Create audit log entries
  if (changes.length > 0) {
    await prisma.insuranceAuditLog.createMany({
      data: changes.map((change) => ({
        insurancePolicyId: policyId,
        changedByUserId,
        field: change.field,
        oldValue: change.oldValue ? JSON.stringify(change.oldValue) : null,
        newValue: change.newValue ? JSON.stringify(change.newValue) : null,
      })),
    })
  }
}

/**
 * GET /api/registrar/patient/[patientId]/insurance
 * 
 * Get insurance information for a patient (registrar view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const patientId = params.patientId

    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        insurancePolicies: {
          orderBy: { isPrimary: 'desc' },
          include: {
            auditLogs: {
              orderBy: { changedAt: 'desc' },
              take: 10,
              include: {
                changedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dob: patient.dob,
      },
      insurancePolicies: patient.insurancePolicies,
    })
  } catch (error) {
    console.error('Error fetching insurance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insurance information' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/registrar/patient/[patientId]/insurance
 * 
 * Update insurance information (registrar edit)
 * Requires changedByUserId in request body
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const patientId = params.patientId
    const rawBody = await request.json()
    
    // Extract changedByUserId (required for audit logging)
    const { changedByUserId, policyId, ...updateData } = rawBody

    if (!changedByUserId) {
      return NextResponse.json(
        { error: 'changedByUserId is required for audit logging' },
        { status: 400 }
      )
    }

    if (!policyId) {
      return NextResponse.json(
        { error: 'policyId is required' },
        { status: 400 }
      )
    }

    // Validate update data
    const body = InsuranceUpdateSchema.parse(updateData)

    // Get existing policy
    const existingPolicy = await prisma.insurancePolicy.findUnique({
      where: { id: policyId },
    })

    if (!existingPolicy || existingPolicy.patientProfileId !== patientId) {
      return NextResponse.json(
        { error: 'Insurance policy not found' },
        { status: 404 }
      )
    }

    // Normalize strings
    const normalizeString = (str: string | null | undefined): string | null => {
      if (!str) return null
      return str.trim().toUpperCase() || null
    }

    // Parse subscriber DOB
    let subscriberDOB: Date | null = null
    if (body.subscriberDOB) {
      subscriberDOB = new Date(body.subscriberDOB)
      if (isNaN(subscriberDOB.getTime())) {
        subscriberDOB = null
      }
    }

    // Prepare update data
    const updatePayload: any = {}
    if (body.insuranceStatus !== undefined) {
      updatePayload.insuranceStatus = body.insuranceStatus as InsuranceStatus
    }
    if (body.insuranceCarrierName !== undefined) {
      updatePayload.insuranceCarrierName = normalizeString(body.insuranceCarrierName)
    }
    if (body.payerId !== undefined) {
      updatePayload.payerId = body.payerId?.trim() || null
    }
    if (body.planName !== undefined) {
      updatePayload.planName = body.planName?.trim() || null
    }
    if (body.planType !== undefined) {
      updatePayload.planType = body.planType as PlanType | null
    }
    if (body.policyId !== undefined) {
      updatePayload.policyId = body.policyId?.trim() || null
    }
    if (body.groupNumber !== undefined) {
      updatePayload.groupNumber = body.groupNumber?.trim() || null
    }
    if (body.subscriberFullName !== undefined) {
      updatePayload.subscriberFullName = body.subscriberFullName?.trim() || null
    }
    if (body.subscriberDOB !== undefined) {
      updatePayload.subscriberDOB = subscriberDOB
    }
    if (body.subscriberRelationshipToPatient !== undefined) {
      updatePayload.subscriberRelationshipToPatient = body.subscriberRelationshipToPatient as RelationshipType | null
    }
    if (body.subscriberEmployerName !== undefined) {
      updatePayload.subscriberEmployerName = body.subscriberEmployerName?.trim() || null
    }
    if (body.guarantorFullName !== undefined) {
      updatePayload.guarantorFullName = body.guarantorFullName?.trim() || null
    }
    if (body.guarantorRelationshipToPatient !== undefined) {
      updatePayload.guarantorRelationshipToPatient = body.guarantorRelationshipToPatient as RelationshipType | null
    }
    if (body.guarantorAddressLine1 !== undefined) {
      updatePayload.guarantorAddressLine1 = body.guarantorAddressLine1?.trim() || null
    }
    if (body.guarantorAddressLine2 !== undefined) {
      updatePayload.guarantorAddressLine2 = body.guarantorAddressLine2?.trim() || null
    }
    if (body.guarantorCity !== undefined) {
      updatePayload.guarantorCity = body.guarantorCity?.trim() || null
    }
    if (body.guarantorState !== undefined) {
      updatePayload.guarantorState = normalizeString(body.guarantorState)
    }
    if (body.guarantorZip !== undefined) {
      updatePayload.guarantorZip = body.guarantorZip?.trim() || null
    }
    if (body.guarantorPhoneNumber !== undefined) {
      updatePayload.guarantorPhoneNumber = body.guarantorPhoneNumber?.trim() || null
    }
    if (body.cardFrontImageUrl !== undefined) {
      updatePayload.cardFrontImageUrl = body.cardFrontImageUrl || null
    }
    if (body.cardBackImageUrl !== undefined) {
      updatePayload.cardBackImageUrl = body.cardBackImageUrl || null
    }

    // Validate that VERIFIED status requires certain fields
    if (updatePayload.insuranceStatus === InsuranceStatus.VERIFIED) {
      if (!updatePayload.insuranceCarrierName || !updatePayload.policyId || !updatePayload.subscriberFullName || !updatePayload.subscriberDOB) {
        return NextResponse.json(
          {
            error: 'Cannot verify insurance: missing required fields (carrier, policy ID, subscriber name, subscriber DOB)',
          },
          { status: 400 }
        )
      }
    }

    // Update policy
    const updatedPolicy = await prisma.insurancePolicy.update({
      where: { id: policyId },
      data: updatePayload,
    })

    // Create audit logs for changed fields
    const fieldsToTrack = Object.keys(updatePayload)
    await createAuditLogs(policyId, changedByUserId, existingPolicy, updatedPolicy, fieldsToTrack)

    return NextResponse.json({
      success: true,
      insurancePolicy: updatedPolicy,
    })
  } catch (error) {
    console.error('Error updating insurance:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to update insurance information',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    )
  }
}

