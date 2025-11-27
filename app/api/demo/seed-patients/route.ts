import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus, ArrivalPath, Sex, IntakeSource, EwsType, EwsLevel } from '@prisma/client'

/**
 * POST /api/demo/seed-patients
 * 
 * Creates sample patients for demo purposes
 */
export async function POST(request: NextRequest) {
  try {
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      )
    }

    // Sample patients data
    const samplePatients = [
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        dob: new Date('1990-03-15'),
        sex: Sex.FEMALE,
        phone: '555-0101',
        complaint: 'CHEST_PAIN',
        complaintText: 'Chest pain for 2 hours',
        ewsScore: 6,
        ewsLevel: EwsLevel.HIGH,
        waitMinutes: 15,
      },
      {
        firstName: 'Michael',
        lastName: 'Chen',
        dob: new Date('1985-07-22'),
        sex: Sex.MALE,
        phone: '555-0102',
        complaint: 'SHORTNESS_OF_BREATH',
        complaintText: 'Difficulty breathing',
        ewsScore: 8,
        ewsLevel: EwsLevel.CRITICAL,
        waitMinutes: 5,
      },
      {
        firstName: 'Emily',
        lastName: 'Rodriguez',
        dob: new Date('1995-11-08'),
        sex: Sex.FEMALE,
        phone: '555-0103',
        complaint: 'ABDOMINAL_PAIN',
        complaintText: 'Stomach pain since morning',
        ewsScore: 3,
        ewsLevel: EwsLevel.MODERATE,
        waitMinutes: 45,
      },
      {
        firstName: 'David',
        lastName: 'Williams',
        dob: new Date('1978-09-30'),
        sex: Sex.MALE,
        phone: '555-0104',
        complaint: 'FEVER',
        complaintText: 'High fever and chills',
        ewsScore: 4,
        ewsLevel: EwsLevel.MODERATE,
        waitMinutes: 30,
      },
    ]

    const createdVisits = []

    for (const patient of samplePatients) {
      const arrivalTime = new Date()
      arrivalTime.setMinutes(arrivalTime.getMinutes() - patient.waitMinutes)

      // Check if patient already exists
      const existingPatient = await prisma.patientProfile.findFirst({
        where: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          dob: patient.dob,
        },
      })

      let patientProfile
      if (existingPatient) {
        patientProfile = existingPatient
      } else {
        patientProfile = await prisma.patientProfile.create({
          data: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            dob: patient.dob,
            sex: patient.sex,
            phone: patient.phone,
          },
        })
      }

      // Create visit
      const visit = await prisma.visit.create({
        data: {
          patientProfileId: patientProfile.id,
          status: VisitStatus.WAITING,
          arrivalPath: ArrivalPath.WALK_IN,
          arrivalTimestamp: arrivalTime,
        },
      })

      // Create intake form
      await prisma.intakeForm.create({
        data: {
          visitId: visit.id,
          intakeSource: IntakeSource.MOBILE,
          chiefComplaintCategory: patient.complaint,
          chiefComplaintText: patient.complaintText,
        },
      })

      // Create EWS assessment
      await prisma.ewsAssessment.create({
        data: {
          visitId: visit.id,
          type: EwsType.PROVISIONAL,
          score: patient.ewsScore,
          level: patient.ewsLevel,
          flags: [],
        },
      })

      createdVisits.push(visit.id)
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdVisits.length} sample patients`,
      visitIds: createdVisits,
    })
  } catch (error: any) {
    console.error('Error seeding demo patients:', error)
    return NextResponse.json(
      {
        error: 'Failed to seed demo patients',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

