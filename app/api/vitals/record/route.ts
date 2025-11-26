import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeVerifiedEws } from '@/lib/ews/computeVerifiedEws'
import { EwsType } from '@prisma/client'
import { calculateAge } from '@/lib/utils/age'

/**
 * Request body for recording vitals
 */
interface RecordVitalsRequest {
  visitId: string
  heartRate?: number | null
  bloodPressureSystolic?: number | null
  bloodPressureDiastolic?: number | null
  respirations?: number | null
  temperature?: number | null // Fahrenheit
  spo2?: number | null // Oxygen saturation percentage
  weight?: number | null
  recordedByUserId: string // Staff user ID who recorded the vitals
}

/**
 * POST /api/vitals/record
 * 
 * Records vitals for a visit and creates a verified EWS assessment
 */
export async function POST(request: NextRequest) {
  try {
    const body: RecordVitalsRequest = await request.json()

    if (!body.visitId || !body.recordedByUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, recordedByUserId' },
        { status: 400 }
      )
    }

    // Fetch visit with all necessary data for EWS calculation
    const visit = await prisma.visit.findUnique({
      where: { id: body.visitId },
      include: {
        patientProfile: true,
        intakeForm: true,
        ewsAssessments: {
          where: { type: EwsType.PROVISIONAL },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    if (!visit.intakeForm) {
      return NextResponse.json(
        { error: 'Intake form not found for this visit' },
        { status: 400 }
      )
    }

    // Calculate age for EWS
    const age = calculateAge(visit.patientProfile.dob)

    // Prepare vitals data
    const vitalsData = {
      heartRate: body.heartRate ?? null,
      bloodPressureSystolic: body.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: body.bloodPressureDiastolic ?? null,
      respirations: body.respirations ?? null,
      temperature: body.temperature ?? null,
      spo2: body.spo2 ?? null,
      weight: body.weight ?? null,
    }

    // Compute verified EWS using intake + vitals
    const verifiedEws = computeVerifiedEws({
      age,
      chiefComplaintCategory: visit.intakeForm.chiefComplaintCategory,
      symptomAnswers:
        visit.intakeForm.symptomAnswers && typeof visit.intakeForm.symptomAnswers === 'object'
          ? (visit.intakeForm.symptomAnswers as Record<string, any>)
          : null,
      riskFactors:
        visit.intakeForm.riskFactors && typeof visit.intakeForm.riskFactors === 'object'
          ? (visit.intakeForm.riskFactors as Record<string, any>)
          : null,
      vitals: vitalsData,
    })

    // Create vitals record and verified EWS in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create vitals record
      const vitals = await tx.vitals.create({
        data: {
          visitId: body.visitId,
          heartRate: vitalsData.heartRate,
          bloodPressureSystolic: vitalsData.bloodPressureSystolic,
          bloodPressureDiastolic: vitalsData.bloodPressureDiastolic,
          respirations: vitalsData.respirations,
          temperature: vitalsData.temperature,
          spo2: vitalsData.spo2,
          weight: vitalsData.weight,
          recordedByUserId: body.recordedByUserId,
        },
      })

      // Create verified EWS assessment
      const ewsAssessment = await tx.ewsAssessment.create({
        data: {
          visitId: body.visitId,
          type: EwsType.VERIFIED,
          score: verifiedEws.score,
          level: verifiedEws.level,
          flags: verifiedEws.flags.length > 0 ? verifiedEws.flags : undefined,
          createdByUserId: body.recordedByUserId,
        },
      })

      return { vitals, ewsAssessment }
    })

    return NextResponse.json(
      {
        success: true,
        vitals: result.vitals,
        ews: {
          score: verifiedEws.score,
          level: verifiedEws.level,
          flags: verifiedEws.flags,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error recording vitals:', error)
    return NextResponse.json(
      { error: 'Failed to record vitals' },
      { status: 500 }
    )
  }
}

