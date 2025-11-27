import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InsuranceStatus, PlanType, RelationshipType, EligibilityResult } from '@prisma/client'
import { z } from 'zod'

/**
 * Schema for patient insurance submission
 */
const InsuranceSubmitSchema = z.object({
  // Insurance status selection
  insuranceStatus: z.enum(['HAS_INSURANCE', 'SELF_PAY', 'UNKNOWN']),
  
  // Plan details (required if HAS_INSURANCE)
  insuranceCarrierName: z.string().max(200).optional().nullable(),
  planName: z.string().max(200).optional().nullable(),
  policyId: z.string().max(100).optional().nullable(),
  groupNumber: z.string().max(100).optional().nullable(),
  planType: z.enum(['PPO', 'HMO', 'EPO', 'POS', 'MEDICARE', 'MEDICAID', 'TRICARE', 'OTHER']).optional().nullable(),
  
  // Subscriber info
  subscriberIsPatient: z.boolean().optional(),
  subscriberFullName: z.string().max(200).optional().nullable(),
  subscriberDOB: z.string().datetime().optional().nullable(),
  subscriberRelationshipToPatient: z.enum(['SELF', 'PARENT', 'SPOUSE', 'CHILD', 'OTHER']).optional().nullable(),
  subscriberEmployerName: z.string().max(200).optional().nullable(),
  
  // Guarantor info
  guarantorIsSubscriber: z.boolean().optional(),
  guarantorFullName: z.string().max(200).optional().nullable(),
  guarantorRelationshipToPatient: z.enum(['SELF', 'PARENT', 'SPOUSE', 'CHILD', 'OTHER']).optional().nullable(),
  guarantorAddressLine1: z.string().max(200).optional().nullable(),
  guarantorAddressLine2: z.string().max(200).optional().nullable(),
  guarantorCity: z.string().max(100).optional().nullable(),
  guarantorState: z.string().max(50).optional().nullable(),
  guarantorZip: z.string().max(20).optional().nullable(),
  guarantorPhoneNumber: z.string().max(20).optional().nullable(),
  
  // Card images (URLs - will be uploaded separately)
  cardFrontImageUrl: z.string().url().optional().nullable(),
  cardBackImageUrl: z.string().url().optional().nullable(),
  
  // Financial assistance
  wantsFinancialAssistance: z.boolean().optional(),
}).refine(
  (data) => {
    // If HAS_INSURANCE, require carrier and policyId
    if (data.insuranceStatus === 'HAS_INSURANCE') {
      return !!data.insuranceCarrierName && !!data.policyId
    }
    return true
  },
  {
    message: 'Insurance carrier and policy ID are required when you have insurance',
    path: ['insuranceCarrierName'],
  }
)

type InsuranceSubmitRequest = z.infer<typeof InsuranceSubmitSchema>

/**
 * POST /api/visits/[visitId]/insurance
 * 
 * Patient submits insurance information during intake
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const visitId = params.visitId

    // Parse and validate request
    let body: InsuranceSubmitRequest
    try {
      const rawBody = await request.json()
      body = InsuranceSubmitSchema.parse(rawBody)
    } catch (error) {
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
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Get visit with patient info
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { patientProfile: true },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    // Determine insurance status based on patient selection
    let insuranceStatus: InsuranceStatus
    if (body.insuranceStatus === 'SELF_PAY') {
      insuranceStatus = InsuranceStatus.SELF_PAY
    } else if (body.insuranceStatus === 'UNKNOWN') {
      insuranceStatus = InsuranceStatus.UNKNOWN
    } else if (body.insuranceStatus === 'HAS_INSURANCE') {
      // Check if required fields are present
      if (!body.insuranceCarrierName || !body.policyId) {
        insuranceStatus = InsuranceStatus.MISSING_INFO
      } else {
        // Check if subscriber info is complete (if subscriber is not patient)
        if (!body.subscriberIsPatient) {
          if (!body.subscriberFullName || !body.subscriberDOB) {
            insuranceStatus = InsuranceStatus.MISSING_INFO
          } else {
            insuranceStatus = InsuranceStatus.PENDING_VERIFICATION
          }
        } else {
          insuranceStatus = InsuranceStatus.PENDING_VERIFICATION
        }
      }
    } else {
      insuranceStatus = InsuranceStatus.NOT_PROVIDED
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

    // Map plan type
    let planType: PlanType | null = null
    if (body.planType) {
      planType = body.planType as PlanType
    }

    // Map relationship type
    let subscriberRelationship: RelationshipType | null = null
    if (body.subscriberRelationshipToPatient) {
      subscriberRelationship = body.subscriberRelationshipToPatient as RelationshipType
    }

    let guarantorRelationship: RelationshipType | null = null
    if (body.guarantorRelationshipToPatient) {
      guarantorRelationship = body.guarantorRelationshipToPatient as RelationshipType
    }

    // Check if insurance policy already exists for this visit
    const existingPolicy = await prisma.insurancePolicy.findFirst({
      where: {
        visitId: visitId,
        isPrimary: true,
      },
    })

    // Create or update insurance policy
    const insurancePolicy = existingPolicy
      ? await prisma.insurancePolicy.update({
          where: { id: existingPolicy.id },
          data: {
            insuranceStatus,
            insuranceCarrierName: normalizeString(body.insuranceCarrierName),
            planName: body.planName?.trim() || null,
            planType,
            policyId: body.policyId?.trim() || null,
            groupNumber: body.groupNumber?.trim() || null,
            subscriberFullName: body.subscriberFullName?.trim() || null,
            subscriberDOB,
            subscriberRelationshipToPatient: subscriberRelationship,
            subscriberEmployerName: body.subscriberEmployerName?.trim() || null,
            guarantorFullName: body.guarantorFullName?.trim() || null,
            guarantorRelationshipToPatient: guarantorRelationship,
            guarantorAddressLine1: body.guarantorAddressLine1?.trim() || null,
            guarantorAddressLine2: body.guarantorAddressLine2?.trim() || null,
            guarantorCity: body.guarantorCity?.trim() || null,
            guarantorState: normalizeString(body.guarantorState),
            guarantorZip: body.guarantorZip?.trim() || null,
            guarantorPhoneNumber: body.guarantorPhoneNumber?.trim() || null,
            cardFrontImageUrl: body.cardFrontImageUrl || null,
            cardBackImageUrl: body.cardBackImageUrl || null,
          },
        })
      : await prisma.insurancePolicy.create({
          data: {
            patientProfileId: visit.patientProfileId,
            visitId: visitId,
            isPrimary: true,
            insuranceStatus,
            insuranceCarrierName: normalizeString(body.insuranceCarrierName),
            planName: body.planName?.trim() || null,
            planType,
            policyId: body.policyId?.trim() || null,
            groupNumber: body.groupNumber?.trim() || null,
            subscriberFullName: body.subscriberFullName?.trim() || null,
            subscriberDOB,
            subscriberRelationshipToPatient: subscriberRelationship,
            subscriberEmployerName: body.subscriberEmployerName?.trim() || null,
            guarantorFullName: body.guarantorFullName?.trim() || null,
            guarantorRelationshipToPatient: guarantorRelationship,
            guarantorAddressLine1: body.guarantorAddressLine1?.trim() || null,
            guarantorAddressLine2: body.guarantorAddressLine2?.trim() || null,
            guarantorCity: body.guarantorCity?.trim() || null,
            guarantorState: normalizeString(body.guarantorState),
            guarantorZip: body.guarantorZip?.trim() || null,
            guarantorPhoneNumber: body.guarantorPhoneNumber?.trim() || null,
            cardFrontImageUrl: body.cardFrontImageUrl || null,
            cardBackImageUrl: body.cardBackImageUrl || null,
          },
        })

    return NextResponse.json(
      {
        success: true,
        insurancePolicy: {
          id: insurancePolicy.id,
          insuranceStatus: insurancePolicy.insuranceStatus,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error submitting insurance:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        error: 'Failed to submit insurance information',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/visits/[visitId]/insurance
 * 
 * Get insurance information for a visit
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
        insurancePolicies: {
          orderBy: { isPrimary: 'desc' },
        },
      },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      insurancePolicies: visit.insurancePolicies,
    })
  } catch (error) {
    console.error('Error fetching insurance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insurance information' },
      { status: 500 }
    )
  }
}

