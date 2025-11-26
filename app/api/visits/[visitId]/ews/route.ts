import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EwsType } from '@prisma/client'

/**
 * GET /api/visits/[visitId]/ews
 * 
 * Returns EWS assessments for a visit (both provisional and verified)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const visitId = params.visitId

    const assessments = await prisma.ewsAssessment.findMany({
      where: { visitId },
      orderBy: [
        { type: 'desc' }, // VERIFIED before PROVISIONAL
        { createdAt: 'desc' }, // Latest first
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    if (assessments.length === 0) {
      return NextResponse.json({ error: 'No EWS assessments found for this visit' }, { status: 404 })
    }

    const formattedAssessments = assessments.map((assessment) => ({
      id: assessment.id,
      type: assessment.type,
      score: assessment.score,
      level: assessment.level,
      flags: assessment.flags && Array.isArray(assessment.flags) ? assessment.flags : [],
      createdBy: assessment.createdBy
        ? {
            id: assessment.createdBy.id,
            name: assessment.createdBy.name,
            role: assessment.createdBy.role,
          }
        : null,
      createdAt: assessment.createdAt.toISOString(),
    }))

    // Get latest assessment (first in array)
    const latest = formattedAssessments[0]

    return NextResponse.json({
      assessments: formattedAssessments,
      latest,
    })
  } catch (error) {
    console.error('Error fetching EWS assessments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch EWS assessments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/visits/[visitId]/ews
 * 
 * Creates a new EWS assessment for a visit.
 * Typically used to update verified EWS after vitals are taken.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const visitId = params.visitId
    const body = await request.json()

    // Validate required fields
    if (!body.type || !body.level || !body.createdByUserId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: type, level, createdByUserId',
        },
        { status: 400 }
      )
    }

    // Verify visit exists
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    // Create EWS assessment
    const assessment = await prisma.ewsAssessment.create({
      data: {
        visitId,
        type: body.type as EwsType,
        score: body.score ?? null,
        level: body.level,
        flags: body.flags && body.flags.length > 0 ? body.flags : undefined,
        createdByUserId: body.createdByUserId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        assessment: {
          id: assessment.id,
          type: assessment.type,
          score: assessment.score,
          level: assessment.level,
          flags: assessment.flags && Array.isArray(assessment.flags) ? assessment.flags : [],
          createdBy: assessment.createdBy
            ? {
                id: assessment.createdBy.id,
                name: assessment.createdBy.name,
                role: assessment.createdBy.role,
              }
            : null,
          createdAt: assessment.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating EWS assessment:', error)
    return NextResponse.json(
      { error: 'Failed to create EWS assessment' },
      { status: 500 }
    )
  }
}

