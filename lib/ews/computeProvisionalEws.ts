import { EwsLevel } from '@prisma/client'

/**
 * EWS Assessment Result
 */
export interface EwsResult {
  score: number | null
  level: EwsLevel
  flags: string[]
}

/**
 * Input payload for provisional EWS calculation
 */
export interface IntakePayload {
  age: number
  chiefComplaintCategory?: string | null
  symptomAnswers?: Record<string, any> | null
  riskFactors?: Record<string, any> | null
}

/**
 * Configuration for EWS calculation weights and thresholds
 * 
 * This allows tuning the scoring algorithm without code changes.
 * In production, these values could be loaded from a database or environment variables.
 */
export interface EwsConfig {
  // Age-based scoring weights
  age: {
    // Points added for each age bracket
    // Older patients are at higher risk for complications
    brackets: Array<{ minAge: number; maxAge: number; points: number }>
  }

  // Chief complaint category weights
  // Higher weights for complaints that suggest time-sensitive conditions
  complaintWeights: Record<string, number>

  // Symptom-based scoring
  // Specific symptoms that indicate higher risk
  symptomWeights: Record<string, number>

  // Risk factor weights
  // Pre-existing conditions or medications that increase risk
  riskFactorWeights: Record<string, number>

  // Score thresholds for risk levels
  // Maps total score to EWS level
  thresholds: {
    critical: number // Score >= this = CRITICAL
    high: number // Score >= this = HIGH
    moderate: number // Score >= this = MODERATE
    // Below moderate = LOW
  }

  // Flags configuration
  // Conditions that trigger specific warning flags
  flagRules: Array<{
    condition: (payload: IntakePayload, score: number) => boolean
    flag: string
  }>
}

/**
 * Default EWS configuration
 * 
 * These are reasonable starting values based on common clinical risk factors.
 * Should be reviewed and adjusted by clinical staff.
 */
const DEFAULT_EWS_CONFIG: EwsConfig = {
  age: {
    // Age brackets with increasing risk
    // Older patients have higher baseline risk
    brackets: [
      { minAge: 0, maxAge: 17, points: 0 }, // Pediatric: baseline
      { minAge: 18, maxAge: 49, points: 0 }, // Young adult: baseline
      { minAge: 50, maxAge: 64, points: 1 }, // Middle-aged: +1 point
      { minAge: 65, maxAge: 79, points: 2 }, // Elderly: +2 points
      { minAge: 80, maxAge: 999, points: 3 }, // Very elderly: +3 points
    ],
  },

  complaintWeights: {
    // High-risk complaint categories
    // These suggest time-sensitive conditions requiring immediate attention
    'Chest Pain': 3, // Possible ACS, PE, aortic dissection
    'Shortness of Breath': 3, // Possible PE, MI, respiratory failure
    'Stroke-like Symptoms': 4, // Possible stroke - time-critical
    'Severe Headache': 2, // Possible SAH, meningitis
    'Abdominal Pain': 1, // Possible appendicitis, AAA, etc.
    'Trauma': 2, // Possible internal injuries
    'Altered Mental Status': 3, // Possible stroke, infection, metabolic
    'Seizure': 2, // Possible status epilepticus
    'Overdose': 3, // Possible toxic ingestion
    'Bleeding': 2, // Possible hemorrhage
    // Default weight for unlisted complaints
    'Other': 0,
  },

  symptomWeights: {
    // High-risk symptom indicators
    // These are specific answers that suggest serious conditions
    radiatingPain: 2, // Chest/back pain radiating suggests ACS/aortic dissection
    chestPainWithExertion: 2, // Suggests cardiac ischemia
    suddenOnset: 2, // Suggests acute event (stroke, MI, PE)
    lossOfConsciousness: 3, // Suggests serious neurological/cardiac event
    difficultySpeaking: 2, // Suggests stroke
    weaknessOnOneSide: 3, // Suggests stroke
    severeShortnessOfBreath: 3, // Suggests respiratory failure, PE
    chestPainWithNausea: 2, // Suggests ACS
    chestPainWithSweating: 2, // Suggests ACS
    severeHeadache: 2, // Suggests SAH, meningitis
    neckStiffness: 2, // Suggests meningitis
    photophobia: 1, // Suggests meningitis
    fever: 1, // Suggests infection
    confusion: 2, // Suggests neurological/metabolic issue
  },

  riskFactorWeights: {
    // Pre-existing conditions that increase risk
    cardiacHistory: 2, // Previous MI, CAD increases ACS risk
    strokeHistory: 2, // Previous stroke increases recurrence risk
    diabetes: 1, // Increases cardiovascular risk
    hypertension: 1, // Increases cardiovascular risk
    anticoagulantUse: 2, // Increases bleeding risk, complicates treatment
    pregnancy: 2, // Special considerations, possible complications
    immunosuppressed: 2, // Increased infection risk
    cancerHistory: 1, // May affect treatment decisions
    bleedingDisorder: 2, // Increases bleeding risk
    recentSurgery: 1, // Possible complications
  },

  thresholds: {
    // Score thresholds for risk level assignment
    // Higher scores = higher risk
    critical: 8, // Score >= 8 = CRITICAL (immediate attention needed)
    high: 5, // Score >= 5 = HIGH (urgent attention)
    moderate: 3, // Score >= 3 = MODERATE (standard priority)
    // Score < 3 = LOW (routine priority)
  },

  flagRules: [
    // Flag: Chest pain with concerning features
    {
      condition: (payload, score) => {
        return (
          payload.chiefComplaintCategory === 'Chest Pain' ||
          payload.symptomAnswers?.chestPain === true ||
          payload.symptomAnswers?.radiatingPain === true
        )
      },
      flag: 'chest_pain_acs',
    },
    // Flag: Stroke-like symptoms
    {
      condition: (payload, score) => {
        return (
          payload.chiefComplaintCategory === 'Stroke-like Symptoms' ||
          payload.symptomAnswers?.difficultySpeaking === true ||
          payload.symptomAnswers?.weaknessOnOneSide === true ||
          payload.symptomAnswers?.suddenOnset === true
        )
      },
      flag: 'stroke_like',
    },
    // Flag: Respiratory distress
    {
      condition: (payload, score) => {
        return (
          payload.chiefComplaintCategory === 'Shortness of Breath' ||
          payload.symptomAnswers?.severeShortnessOfBreath === true ||
          payload.symptomAnswers?.difficultyBreathing === true
        )
      },
      flag: 'respiratory_distress',
    },
    // Flag: High-risk age + cardiac complaint
    {
      condition: (payload, score) => {
        return (
          payload.age >= 65 &&
          (payload.chiefComplaintCategory === 'Chest Pain' ||
            payload.riskFactors?.cardiacHistory === true)
        )
      },
      flag: 'high_risk_cardiac',
    },
    // Flag: Pregnancy with concerning symptoms
    {
      condition: (payload, score) => {
        return (
          payload.riskFactors?.pregnancy === true &&
          (payload.chiefComplaintCategory === 'Abdominal Pain' ||
            payload.chiefComplaintCategory === 'Bleeding' ||
            payload.symptomAnswers?.vaginalBleeding === true)
        )
      },
      flag: 'pregnancy_concern',
    },
  ],
}

/**
 * Computes a provisional Early Warning Score (EWS) based on intake data.
 * 
 * This is a provisional assessment calculated automatically from patient-reported
 * symptoms and risk factors. It should be verified by a nurse after taking vitals.
 * 
 * Scoring algorithm:
 * 1. Age-based points: Older patients get baseline risk points
 * 2. Chief complaint points: High-risk complaints (chest pain, stroke, etc.) add points
 * 3. Symptom points: Specific concerning symptoms add points
 * 4. Risk factor points: Pre-existing conditions/medications add points
 * 5. Total score mapped to risk level (CRITICAL, HIGH, MODERATE, LOW)
 * 6. Flags generated for concerning patterns requiring special attention
 * 
 * @param intakePayload - Patient intake data (age, complaint, symptoms, risk factors)
 * @param config - Optional EWS configuration (uses default if not provided)
 * @returns EWS assessment with score, risk level, and flags
 * 
 * @example
 * ```ts
 * const ews = computeProvisionalEws({
 *   age: 65,
 *   chiefComplaintCategory: "Chest Pain",
 *   symptomAnswers: { radiatingPain: true, chestPainWithSweating: true },
 *   riskFactors: { cardiacHistory: true }
 * });
 * // Returns: { score: 10, level: "CRITICAL", flags: ["chest_pain_acs", "high_risk_cardiac"] }
 * ```
 */
export function computeProvisionalEws(
  intakePayload: IntakePayload,
  config: EwsConfig = DEFAULT_EWS_CONFIG
): EwsResult {
  const { age, chiefComplaintCategory, symptomAnswers, riskFactors } = intakePayload

  let score = 0
  const flags: string[] = []

  // 1. Age-based scoring
  // Older patients have higher baseline risk for complications
  const ageBracket = config.age.brackets.find(
    (bracket) => age >= bracket.minAge && age <= bracket.maxAge
  )
  if (ageBracket) {
    score += ageBracket.points
  }

  // 2. Chief complaint category scoring
  // High-risk complaints (chest pain, stroke, respiratory) add significant points
  if (chiefComplaintCategory) {
    const complaintWeight =
      config.complaintWeights[chiefComplaintCategory] ??
      config.complaintWeights['Other'] ??
      0
    score += complaintWeight
  }

  // 3. Symptom-based scoring
  // Specific symptoms that indicate higher risk add points
  if (symptomAnswers) {
    for (const [symptom, value] of Object.entries(symptomAnswers)) {
      // Only count symptoms that are present/true
      if (value === true || value === 'true' || value === 'yes') {
        const symptomWeight = config.symptomWeights[symptom] ?? 0
        score += symptomWeight
      }
    }
  }

  // 4. Risk factor scoring
  // Pre-existing conditions and medications that increase risk
  if (riskFactors) {
    for (const [factor, value] of Object.entries(riskFactors)) {
      // Only count risk factors that are present/true
      if (value === true || value === 'true' || value === 'yes') {
        const factorWeight = config.riskFactorWeights[factor] ?? 0
        score += factorWeight
      }
    }
  }

  // 5. Map score to risk level
  // Higher scores indicate higher risk requiring more urgent attention
  let level: EwsLevel = EwsLevel.LOW
  if (score >= config.thresholds.critical) {
    level = EwsLevel.CRITICAL
  } else if (score >= config.thresholds.high) {
    level = EwsLevel.HIGH
  } else if (score >= config.thresholds.moderate) {
    level = EwsLevel.MODERATE
  }

  // 6. Generate flags for concerning patterns
  // Flags alert staff to specific conditions requiring special attention
  for (const rule of config.flagRules) {
    if (rule.condition(intakePayload, score)) {
      flags.push(rule.flag)
    }
  }

  // Remove duplicate flags
  const uniqueFlags = Array.from(new Set(flags))

  return {
    score,
    level,
    flags: uniqueFlags,
  }
}

