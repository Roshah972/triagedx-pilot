import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus, ArrivalPath, Sex, IntakeSource, EwsType } from '@prisma/client'
import { calculateAge, calculateAgeBracket } from '@/lib/utils/age'
import { evaluateTriage } from '@/lib/triage/triageEngine'
import { triageResultToEwsResult, prismaSexToBiologicalSex } from '@/lib/triage/adapter'
import { mapOldComplaintCategory } from '@/lib/triage/complaintMapper'
import type { TriagePatientContext } from '@/lib/triage/types'

/**
 * Request body for quick visit creation (trauma/direct-to-room)
 */
interface QuickVisitRequest {
  firstName: string
  lastName?: string
  approximateAge?: number
  sex?: Sex
  arrivalPath: ArrivalPath
  status: VisitStatus // IN_TRIAGE or ROOMED
  chiefComplaintCategory?: string | null
  chiefComplaintText?: string | null
  notes?: string | null
}

/**
 * POST /api/visits/quick-create
 * 
 * Creates a visit quickly for trauma/direct-to-room cases with minimal information.
 * Patient profile is created with minimal data, and visit is immediately marked
 * as IN_TRIAGE or ROOMED.
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuickVisitRequest = await request.json()

    if (!body.firstName || !body.arrivalPath || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, arrivalPath, status' },
        { status: 400 }
      )
    }

    // Validate status is appropriate for quick create
    if (body.status !== VisitStatus.IN_TRIAGE && body.status !== VisitStatus.ROOMED) {
      return NextResponse.json(
        { error: 'Status must be IN_TRIAGE or ROOMED for quick-create visits' },
        { status: 400 }
      )
    }

    // Estimate DOB from approximate age if provided
    let dob: Date
    if (body.approximateAge) {
      const today = new Date()
      dob = new Date(
        today.getFullYear() - body.approximateAge,
        today.getMonth(),
        today.getDate()
      )
    } else {
      // Default to unknown age (50 years)
      const today = new Date()
      dob = new Date(today.getFullYear() - 50, today.getMonth(), today.getDate())
    }

    // Create visit with minimal patient profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create minimal patient profile
      const patientProfile = await tx.patientProfile.create({
        data: {
          firstName: body.firstName,
          lastName: body.lastName || 'Unknown',
          dob,
          sex: body.sex || Sex.UNKNOWN,
        },
      })

      // Create visit with specified status and arrival path
      const visit = await tx.visit.create({
        data: {
          patientProfileId: patientProfile.id,
          status: body.status,
          arrivalPath: body.arrivalPath,
          notes: body.notes || null,
        },
      })

      // Create minimal intake form if complaint provided
      if (body.chiefComplaintCategory || body.chiefComplaintText) {
        await tx.intakeForm.create({
          data: {
            visitId: visit.id,
            intakeSource: IntakeSource.STAFF_ASSISTED,
            chiefComplaintCategory: body.chiefComplaintCategory || null,
            chiefComplaintText: body.chiefComplaintText || null,
          },
        })

        // Evaluate triage if we have complaint
        if (body.chiefComplaintCategory) {
          const age = body.approximateAge || 50
          const ageBracket = calculateAgeBracket(age)
          
          // Build patient context for triage evaluation
          const patientContext: TriagePatientContext = {
            ageAtVisit: age,
            ageBracket,
            biologicalSex: prismaSexToBiologicalSex(patientProfile.sex),
          }

          // Map old complaint category to new enum format
          const complaintCategory = mapOldComplaintCategory(body.chiefComplaintCategory)

          // Evaluate triage using new age-aware, sex-aware triage engine
          const triageResult = evaluateTriage({
            patient: patientContext,
            complaintCategory,
            answers: {},
          })

          // Convert triage result to EWS result format for backward compatibility
          const ewsResult = triageResultToEwsResult(triageResult)

          await tx.ewsAssessment.create({
            data: {
              visitId: visit.id,
              type: EwsType.PROVISIONAL,
              score: ewsResult.score,
              level: ewsResult.level,
              flags: ewsResult.flags.length > 0 ? ewsResult.flags : undefined,
            },
          })
        }
      }

      return { visit, patientProfile }
    })

    return NextResponse.json(
      {
        success: true,
        visit: {
          id: result.visit.id,
          status: result.visit.status,
          arrivalPath: result.visit.arrivalPath,
        },
        patient: {
          id: result.patientProfile.id,
          name: `${result.patientProfile.firstName} ${result.patientProfile.lastName}`,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating quick visit:', error)
    return NextResponse.json(
      { error: 'Failed to create visit' },
      { status: 500 }
    )
  }
}

