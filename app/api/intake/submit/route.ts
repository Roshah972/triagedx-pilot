import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { IntakeSource, EwsType, EwsLevel, Sex, VisitStatus } from '@prisma/client'
import { z } from 'zod'
import { calculateAge, calculateAgeBracket } from '@/lib/utils/age'
import { evaluateTriage } from '@/lib/triage/triageEngine'
import { triageResultToEwsResult, prismaSexToBiologicalSex } from '@/lib/triage/adapter'
import { mapOldComplaintCategory } from '@/lib/triage/complaintMapper'
import type { TriagePatientContext } from '@/lib/triage/types'

/**
 * Zod schema for intake submission validation
 * 
 * Validates request payload with different requirements based on intakeSource:
 * - MOBILE/KIOSK: Requires full demographics (firstName, lastName, dob, sex)
 * - STAFF_ASSISTED: Only requires firstName (can use alias)
 */
const IntakeSubmitSchema = z
  .object({
    // Demographics
    firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
    lastName: z.string().max(100, 'Last name is too long').optional().nullable(),
    dob: z
      .string()
      .datetime({ message: 'Date of birth must be a valid ISO 8601 date string' })
      .optional()
      .nullable(),
    approximateAge: z
      .number()
      .int('Approximate age must be an integer')
      .min(0, 'Approximate age cannot be negative')
      .max(150, 'Approximate age is invalid')
      .optional()
      .nullable(),
    sex: z.nativeEnum(Sex).optional().nullable(),
    phone: z
      .string()
      .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
      .max(20, 'Phone number is too long')
      .optional()
      .nullable(),
    email: z.string().email('Invalid email format').max(255, 'Email is too long').optional().nullable(),
    addressLine1: z.string().max(200, 'Address line 1 is too long').optional().nullable(),
    addressLine2: z.string().max(200, 'Address line 2 is too long').optional().nullable(),
    city: z.string().max(100, 'City name is too long').optional().nullable(),
    state: z.string().max(50, 'State name is too long').optional().nullable(),
    zipCode: z
      .string()
      .regex(/^[\d\-]+$/, 'Invalid zip code format')
      .max(10, 'Zip code is too long')
      .optional()
      .nullable(),
    country: z.string().max(100, 'Country name is too long').optional().nullable(),
    languagePreference: z.string().max(10, 'Language preference code is too long').optional().nullable(),

    // Intake metadata
    intakeSource: z.nativeEnum(IntakeSource),

    // Chief complaint
    chiefComplaintCategory: z.string().max(100, 'Chief complaint category is too long').optional().nullable(),
    chiefComplaintText: z.string().max(1000, 'Chief complaint text is too long').optional().nullable(),

    // Symptoms and risk factors
    symptomAnswers: z.record(z.string(), z.any()).optional().nullable(),
    riskFactors: z.record(z.string(), z.any()).optional().nullable(),
  })
  .refine(
    (data) => {
      // For MOBILE/KIOSK, require lastName, dob, and sex
      if (data.intakeSource === IntakeSource.MOBILE || data.intakeSource === IntakeSource.KIOSK) {
        return (
          data.lastName !== null &&
          data.lastName !== undefined &&
          data.dob !== null &&
          data.dob !== undefined &&
          data.sex !== null &&
          data.sex !== undefined
        )
      }
      return true
    },
    {
      message:
        'For MOBILE or KIOSK intake sources, lastName, dob, and sex are required fields',
      path: ['lastName'], // Error will be attached to lastName field
    }
  )
  .refine(
    (data) => {
      // Validate DOB format if provided
      if (data.dob) {
        const dobDate = new Date(data.dob)
        if (isNaN(dobDate.getTime())) {
          return false
        }
        // Ensure DOB is not in the future
        if (dobDate > new Date()) {
          return false
        }
        // Ensure DOB is not too far in the past (reasonable age limit)
        const minDate = new Date()
        minDate.setFullYear(minDate.getFullYear() - 150)
        if (dobDate < minDate) {
          return false
        }
      }
      return true
    },
    {
      message: 'Date of birth must be a valid date in the past (not more than 150 years ago)',
      path: ['dob'],
    }
  )

/**
 * Request body for intake submission
 */
type IntakeSubmitRequest = z.infer<typeof IntakeSubmitSchema>

/**
 * Response for intake submission
 */
interface IntakeSubmitResponse {
  visit: {
    id: string
    arrivalTimestamp: string
    status: VisitStatus
  }
  patient: {
    id: string
    firstName: string
    lastName: string
    dob: string
  }
  ews: {
    score: number | null
    level: string
    flags: string[]
  }
  message: string
}


/**
 * Check for existing patient by DOB + name (duplicate detection)
 */
async function findExistingPatient(
  firstName: string,
  lastName: string,
  dob: Date
): Promise<string | null> {
  const existing = await prisma.patientProfile.findFirst({
    where: {
      firstName: { equals: firstName, mode: 'insensitive' },
      lastName: { equals: lastName, mode: 'insensitive' },
      dob: {
        gte: new Date(dob.getFullYear(), dob.getMonth(), dob.getDate()),
        lt: new Date(dob.getFullYear(), dob.getMonth(), dob.getDate() + 1),
      },
    },
    select: { id: true },
  })

  return existing?.id ?? null
}

/**
 * POST /api/intake/submit
 * 
 * Accepts patient intake data from P-Portal, creates or updates PatientProfile,
 * creates a Visit, stores IntakeForm, computes provisional EWS, and returns
 * the created visit + EWS summary.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Prisma is available
    if (!prisma) {
      console.error('Prisma client not initialized')
      return NextResponse.json(
        { error: 'Database connection not available. Please try again.' },
        { status: 503 }
      )
    }

    // Parse and validate request body with Zod
    let body: IntakeSubmitRequest
    try {
      const rawBody = await request.json()
      body = IntakeSubmitSchema.parse(rawBody)
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors into a user-friendly response
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: errors,
          },
          { status: 400 }
        )
      }
      // Handle JSON parse errors
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Validate required fields
    // For STAFF_ASSISTED, only require minimal fields
    const isStaffAssisted = body.intakeSource === IntakeSource.STAFF_ASSISTED

    // Parse and validate DOB (if provided)
    let dob: Date
    if (body.dob) {
      dob = new Date(body.dob)
      // Additional validation (Zod already validated format, but double-check)
      if (isNaN(dob.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date of birth format' },
          { status: 400 }
        )
      }
    } else if (isStaffAssisted && body.approximateAge) {
      // For staff-assisted, estimate DOB from approximate age
      const today = new Date()
      dob = new Date(today.getFullYear() - body.approximateAge, today.getMonth(), today.getDate())
    } else if (isStaffAssisted) {
      // Default to unknown age if not provided
      const today = new Date()
      dob = new Date(today.getFullYear() - 50, today.getMonth(), today.getDate()) // Default to 50
    } else {
      // This should not happen due to Zod validation, but keep as safety check
      return NextResponse.json(
        { error: 'Missing required field: dob' },
        { status: 400 }
      )
    }

    // Calculate age for triage evaluation
    const age = calculateAge(dob)
    const ageBracket = calculateAgeBracket(age)

    // Check for existing patient (duplicate detection) - skip for staff-assisted if minimal info
    let existingPatientId: string | null = null
    if (!isStaffAssisted && body.lastName) {
      existingPatientId = await findExistingPatient(body.firstName, body.lastName, dob)
    }

    // Create or update patient profile
    const patientProfile = existingPatientId
      ? await prisma.patientProfile.update({
          where: { id: existingPatientId },
          data: {
            phone: body.phone ?? undefined,
            email: body.email ?? undefined,
            addressLine1: body.addressLine1 ?? undefined,
            addressLine2: body.addressLine2 ?? undefined,
            city: body.city ?? undefined,
            state: body.state ?? undefined,
            zipCode: body.zipCode ?? undefined,
            country: body.country ?? undefined,
            languagePreference: body.languagePreference ?? undefined,
          },
        })
      : await prisma.patientProfile.create({
          data: {
            firstName: body.firstName,
            lastName: body.lastName || 'Unknown', // Default for staff-assisted
            dob,
            sex: body.sex || Sex.UNKNOWN, // Default for staff-assisted
            phone: body.phone ?? null,
            email: body.email ?? null,
            addressLine1: body.addressLine1 ?? null,
            addressLine2: body.addressLine2 ?? null,
            city: body.city ?? null,
            state: body.state ?? null,
            zipCode: body.zipCode ?? null,
            country: body.country ?? 'US',
            languagePreference: body.languagePreference ?? 'en',
          },
        })

    // Map old complaint category to new enum format
    const complaintCategory = mapOldComplaintCategory(body.chiefComplaintCategory)

    // Build patient context for triage evaluation
    const patientContext: TriagePatientContext = {
      ageAtVisit: age,
      ageBracket,
      biologicalSex: prismaSexToBiologicalSex(patientProfile.sex),
    }

    // Evaluate triage using new age-aware, sex-aware triage engine
    let triageResult
    let ewsResult
    try {
      triageResult = evaluateTriage({
        patient: patientContext,
        complaintCategory,
        answers: {
          ...(body.symptomAnswers || {}),
          // Include risk factors in answers for triage evaluation
          ...(body.riskFactors || {}),
        },
      })

      // Convert triage result to EWS result format for backward compatibility
      ewsResult = triageResultToEwsResult(triageResult)
    } catch (triageError) {
      console.error('Error evaluating triage:', triageError)
      // If triage fails, use default low-risk values to prevent blocking intake
      ewsResult = {
        score: 0,
        level: EwsLevel.LOW,
        flags: [],
      }
    }

    // Create visit, intake form, and EWS assessment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create visit
      const visit = await tx.visit.create({
        data: {
          patientProfileId: patientProfile.id,
          status: VisitStatus.WAITING,
        },
      })

      // Create intake form
      await tx.intakeForm.create({
        data: {
          visitId: visit.id,
          intakeSource: body.intakeSource,
          chiefComplaintCategory: body.chiefComplaintCategory ?? null,
          chiefComplaintText: body.chiefComplaintText ?? null,
          symptomAnswers: body.symptomAnswers ?? undefined,
          riskFactors: body.riskFactors ?? undefined,
        },
      })

      // Create provisional EWS assessment
      await tx.ewsAssessment.create({
        data: {
          visitId: visit.id,
          type: EwsType.PROVISIONAL,
          score: ewsResult.score,
          level: ewsResult.level,
          flags: ewsResult.flags.length > 0 ? ewsResult.flags : undefined,
          // createdByUserId is null for provisional assessments
        },
      })

      return visit
    })

    // Return response
    const response: IntakeSubmitResponse = {
      visit: {
        id: result.id,
        arrivalTimestamp: result.arrivalTimestamp.toISOString(),
        status: result.status,
      },
      patient: {
        id: patientProfile.id,
        firstName: patientProfile.firstName,
        lastName: patientProfile.lastName,
        dob: patientProfile.dob.toISOString(),
      },
      ews: {
        score: ewsResult.score,
        level: ewsResult.level,
        flags: ewsResult.flags,
      },
      message: existingPatientId
        ? 'Intake submitted successfully. Existing patient profile updated.'
        : 'Intake submitted successfully. New patient profile created.',
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error submitting intake:', error)
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    } else {
      console.error('Non-Error object:', JSON.stringify(error, null, 2))
    }
    
    // Return more detailed error message for debugging
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error)
    
    const errorString = errorMessage.toLowerCase()
    
    // Check for common database errors
    if (errorString.includes('p2002') || errorString.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'A patient with this information already exists' },
        { status: 409 }
      )
    }
    
    if (errorString.includes('p2003') || errorString.includes('foreign key')) {
      return NextResponse.json(
        { error: 'Invalid reference data' },
        { status: 400 }
      )
    }
    
    // Check for Prisma connection errors
    const isConnectionError = 
      errorString.includes('prisma') || 
      errorString.includes('database') || 
      errorString.includes('connection') ||
      errorString.includes('P1001') || // Prisma connection error code
      errorString.includes('P1002') || // Prisma connection timeout
      errorString.includes('P1003') || // Prisma database does not exist
      errorString.includes('ECONNREFUSED') ||
      errorString.includes('ENOTFOUND')
    
    if (isConnectionError) {
      console.error('Database connection error:', errorMessage)
      return NextResponse.json(
        { 
          error: 'Database connection error. Please try again.',
          details: process.env.NODE_ENV === 'development' 
            ? `Connection failed: ${errorMessage}. Make sure PostgreSQL is running and DATABASE_URL is correct.`
            : undefined
        },
        { status: 503 }
      )
    }
    
    // Return detailed error in development, generic in production
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: isDevelopment 
          ? `Failed to submit intake: ${errorMessage}` 
          : 'Failed to submit intake. Please try again.',
        ...(isDevelopment && { 
          details: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        })
      },
      { status: 500 }
    )
  }
}

