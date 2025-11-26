import { EwsLevel } from '@prisma/client'
import { computeProvisionalEws, IntakePayload, EwsResult } from './computeProvisionalEws'

/**
 * Vitals data for verified EWS calculation
 */
export interface VitalsData {
  heartRate?: number | null
  bloodPressureSystolic?: number | null
  bloodPressureDiastolic?: number | null
  respirations?: number | null
  temperature?: number | null // Fahrenheit
  spo2?: number | null // Oxygen saturation percentage
  weight?: number | null
}

/**
 * Extended payload for verified EWS calculation
 * Includes both intake data and vitals
 */
export interface VerifiedEwsPayload extends IntakePayload {
  vitals?: VitalsData | null
}

/**
 * Computes a verified Early Warning Score (EWS) based on intake data and vitals.
 * 
 * This is a verified assessment calculated after a nurse takes vitals.
 * It combines the provisional EWS with vital sign abnormalities.
 * 
 * Scoring algorithm:
 * 1. Start with provisional EWS score (from intake)
 * 2. Add points for abnormal vitals:
 *    - Heart rate: <60 or >100 bpm
 *    - Blood pressure: Systolic <90 or >160 mmHg
 *    - Respirations: <12 or >20 per minute
 *    - Temperature: <96.8°F or >100.4°F
 *    - SpO2: <95%
 * 3. Map total score to risk level
 * 4. Generate additional flags for critical vitals
 * 
 * @param payload - Patient intake data + vitals
 * @returns EWS assessment with score, risk level, and flags
 */
export function computeVerifiedEws(payload: VerifiedEwsPayload): EwsResult {
  // Start with provisional EWS
  const provisionalEws = computeProvisionalEws(payload)
  let score = provisionalEws.score || 0
  const flags = [...provisionalEws.flags]

  const { vitals } = payload

  if (!vitals) {
    // If no vitals, return provisional EWS
    return provisionalEws
  }

  // Add points for abnormal vitals
  // Heart Rate abnormalities
  if (vitals.heartRate !== null && vitals.heartRate !== undefined) {
    if (vitals.heartRate < 60) {
      score += 2 // Bradycardia
      flags.push('bradycardia')
    } else if (vitals.heartRate > 100) {
      score += 1 // Tachycardia
      if (vitals.heartRate > 120) {
        score += 1 // Severe tachycardia
        flags.push('severe_tachycardia')
      }
    }
  }

  // Blood Pressure abnormalities
  if (vitals.bloodPressureSystolic !== null && vitals.bloodPressureSystolic !== undefined) {
    if (vitals.bloodPressureSystolic < 90) {
      score += 3 // Hypotension - critical
      flags.push('hypotension')
    } else if (vitals.bloodPressureSystolic > 160) {
      score += 1 // Hypertension
      if (vitals.bloodPressureSystolic > 180) {
        score += 1 // Severe hypertension
        flags.push('severe_hypertension')
      }
    }
  }

  // Respiratory rate abnormalities
  if (vitals.respirations !== null && vitals.respirations !== undefined) {
    if (vitals.respirations < 12) {
      score += 2 // Bradypnea
      flags.push('bradypnea')
    } else if (vitals.respirations > 20) {
      score += 1 // Tachypnea
      if (vitals.respirations > 24) {
        score += 2 // Severe tachypnea
        flags.push('severe_tachypnea')
      }
    }
  }

  // Temperature abnormalities
  if (vitals.temperature !== null && vitals.temperature !== undefined) {
    if (vitals.temperature < 96.8) {
      score += 2 // Hypothermia
      flags.push('hypothermia')
    } else if (vitals.temperature > 100.4) {
      score += 1 // Fever
      if (vitals.temperature > 102.2) {
        score += 2 // High fever
        flags.push('high_fever')
      }
    }
  }

  // Oxygen saturation abnormalities
  if (vitals.spo2 !== null && vitals.spo2 !== undefined) {
    if (vitals.spo2 < 95) {
      score += 2 // Low SpO2
      if (vitals.spo2 < 90) {
        score += 2 // Critical SpO2
        flags.push('critical_spo2')
      } else {
        flags.push('low_spo2')
      }
    }
  }

  // Map score to risk level (using same thresholds as provisional)
  let level: EwsLevel = EwsLevel.LOW
  if (score >= 8) {
    level = EwsLevel.CRITICAL
  } else if (score >= 5) {
    level = EwsLevel.HIGH
  } else if (score >= 3) {
    level = EwsLevel.MODERATE
  }

  // Remove duplicate flags
  const uniqueFlags = Array.from(new Set(flags))

  return {
    score,
    level,
    flags: uniqueFlags,
  }
}

