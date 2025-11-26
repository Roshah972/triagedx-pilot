import { prisma } from '@/lib/prisma'
import { VisitStatus, EwsLevel, EwsType, ArrivalPath } from '@prisma/client'

/**
 * Analytics metrics computed from database
 */

export interface TimeToTriageMetric {
  averageMinutes: number | null
  medianMinutes: number | null
  minMinutes: number | null
  maxMinutes: number | null
  count: number
}

export interface EwsDistributionMetric {
  level: EwsLevel
  count: number
  percentage: number
}

export interface ActiveVisitsMetric {
  total: number
  byStatus: {
    waiting: number
    inTriage: number
    roomed: number
  }
  byArrivalPath: {
    walkIn: number
    ems: number
    traumaDirect: number
    other: number
  }
}

/**
 * Calculate time difference in minutes between two dates
 */
function minutesBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
}

/**
 * Computes average time from arrival to triage (when vitals were first recorded).
 * 
 * Logic:
 * 1. Find all visits that have been triaged (have vitals recorded)
 * 2. For each visit, calculate time between arrivalTimestamp and first vitals.recordedAt
 * 3. Calculate average, median, min, max of these durations
 * 
 * Note: This measures time from arrival to when nurse took vitals, which is
 * the practical definition of "triage" in this system.
 */
export async function computeTimeToTriage(): Promise<TimeToTriageMetric> {
  // Get all visits that have vitals (meaning they've been triaged)
  const visitsWithVitals = await prisma.visit.findMany({
    where: {
      vitals: {
        some: {}, // Has at least one vitals record
      },
    },
    include: {
      vitals: {
        orderBy: {
          recordedAt: 'asc', // Get earliest vitals
        },
        take: 1, // Only need the first vitals record
      },
    },
  })

  if (visitsWithVitals.length === 0) {
    return {
      averageMinutes: null,
      medianMinutes: null,
      minMinutes: null,
      maxMinutes: null,
      count: 0,
    }
  }

  // Calculate time to triage for each visit
  const timesToTriage = visitsWithVitals.map((visit) => {
    const arrivalTime = visit.arrivalTimestamp
    const triageTime = visit.vitals[0]?.recordedAt

    if (!triageTime) {
      return null
    }

    return minutesBetween(arrivalTime, triageTime)
  })

  // Filter out nulls (shouldn't happen, but type safety)
  const validTimes = timesToTriage.filter((t): t is number => t !== null)

  if (validTimes.length === 0) {
    return {
      averageMinutes: null,
      medianMinutes: null,
      minMinutes: null,
      maxMinutes: null,
      count: 0,
    }
  }

  // Calculate statistics
  const sorted = [...validTimes].sort((a, b) => a - b)
  const sum = validTimes.reduce((acc, val) => acc + val, 0)
  const average = sum / validTimes.length
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  return {
    averageMinutes: Math.round(average * 10) / 10, // Round to 1 decimal
    medianMinutes: median,
    minMinutes: min,
    maxMinutes: max,
    count: validTimes.length,
  }
}

/**
 * Computes distribution of EWS levels over the last 24 hours.
 * 
 * Logic:
 * 1. Find all visits created in the last 24 hours
 * 2. Get the latest EWS assessment (provisional or verified) for each visit
 * 3. Count visits by EWS level (CRITICAL, HIGH, MODERATE, LOW)
 * 4. Calculate percentage distribution
 * 
 * Note: Uses the latest EWS assessment, preferring verified over provisional
 * if both exist.
 */
export async function computeEwsDistribution(): Promise<EwsDistributionMetric[]> {
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  // Get all visits from last 24 hours with their EWS assessments
  const visits = await prisma.visit.findMany({
    where: {
      arrivalTimestamp: {
        gte: twentyFourHoursAgo,
      },
    },
    include: {
      ewsAssessments: {
        orderBy: [
          { type: 'desc' }, // VERIFIED before PROVISIONAL
          { createdAt: 'desc' }, // Latest first
        ],
        take: 1, // Only need the most recent/relevant assessment
      },
    },
  })

  // Count visits by EWS level
  const levelCounts: Record<EwsLevel, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MODERATE: 0,
    LOW: 0,
  }

  let totalWithEws = 0

  visits.forEach((visit) => {
    const latestEws = visit.ewsAssessments[0]
    if (latestEws) {
      levelCounts[latestEws.level]++
      totalWithEws++
    }
  })

  // Convert to array with percentages
  const distribution: EwsDistributionMetric[] = Object.entries(levelCounts).map(
    ([level, count]) => ({
      level: level as EwsLevel,
      count,
      percentage: totalWithEws > 0 ? Math.round((count / totalWithEws) * 100 * 10) / 10 : 0,
    })
  )

  return distribution
}

/**
 * Computes count of active visits (not discharged or LWBS).
 * 
 * Logic:
 * 1. Count all visits with status WAITING, IN_TRIAGE, or ROOMED
 * 2. Break down by status
 * 3. Break down by arrival path (WALK_IN, EMS, TRAUMA_DIRECT, OTHER)
 */
export async function computeActiveVisits(): Promise<ActiveVisitsMetric> {
  // Get all active visits
  const activeVisits = await prisma.visit.findMany({
    where: {
      status: {
        in: [VisitStatus.WAITING, VisitStatus.IN_TRIAGE, VisitStatus.ROOMED],
      },
    },
    select: {
      status: true,
      arrivalPath: true,
    },
  })

  // Count by status
  const byStatus = {
    waiting: activeVisits.filter((v) => v.status === VisitStatus.WAITING).length,
    inTriage: activeVisits.filter((v) => v.status === VisitStatus.IN_TRIAGE).length,
    roomed: activeVisits.filter((v) => v.status === VisitStatus.ROOMED).length,
  }

  // Count by arrival path
  const byArrivalPath = {
    walkIn: activeVisits.filter((v) => v.arrivalPath === ArrivalPath.WALK_IN).length,
    ems: activeVisits.filter((v) => v.arrivalPath === ArrivalPath.EMS).length,
    traumaDirect: activeVisits.filter((v) => v.arrivalPath === ArrivalPath.TRAUMA_DIRECT).length,
    other: activeVisits.filter((v) => v.arrivalPath === ArrivalPath.OTHER).length,
  }

  return {
    total: activeVisits.length,
    byStatus,
    byArrivalPath,
  }
}

/**
 * Get all analytics metrics in one call
 */
export async function getAllAnalytics() {
  const [timeToTriage, ewsDistribution, activeVisits] = await Promise.all([
    computeTimeToTriage(),
    computeEwsDistribution(),
    computeActiveVisits(),
  ])

  return {
    timeToTriage,
    ewsDistribution,
    activeVisits,
  }
}

