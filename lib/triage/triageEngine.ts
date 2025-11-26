/**
 * Rule-based triage engine
 * 
 * Evaluates patient chief complaints with explicit age and biological sex awareness.
 * Uses transparent, rule-based logic (no black-box ML) to assign severity levels.
 * 
 * Rules are documented with clinical rationale in comments.
 */

import type {
  TriageInput,
  TriageResult,
  TriageRuleHit,
  Severity,
  ChiefComplaintCategory,
} from './types';
import { getComplaintConfig } from './complaintConfig';

/**
 * Evaluate triage severity based on patient context, complaint, and answers
 * 
 * @param input - Triage input with patient context, complaint category, and answers
 * @returns Triage result with severity, rule hits, and rationale
 */
export function evaluateTriage(input: TriageInput): TriageResult {
  const { patient, complaintCategory, complaintSubtype, answers } = input;
  const config = getComplaintConfig(complaintCategory);

  const ruleHits: TriageRuleHit[] = [];

  // Evaluate complaint-specific rules
  switch (complaintCategory) {
    case "CHEST_PAIN":
      evaluateChestPainRules(patient, answers, ruleHits);
      break;
    case "BREATHING":
      evaluateBreathingRules(patient, answers, ruleHits);
      break;
    case "ABDOMINAL_PAIN":
      evaluateAbdominalPainRules(patient, answers, ruleHits);
      break;
    case "FEVER":
      evaluateFeverRules(patient, answers, ruleHits);
      break;
    case "NEURO":
      evaluateNeuroRules(patient, answers, ruleHits);
      break;
    case "TRAUMA":
      evaluateTraumaRules(patient, answers, ruleHits);
      break;
    case "PSYCH":
      evaluatePsychRules(patient, answers, ruleHits);
      break;
    case "OTHER":
      // Default to moderate severity for uncategorized complaints
      ruleHits.push({
        id: "other_default",
        description: "Uncategorized complaint - standard evaluation",
        weight: 2,
      });
      break;
  }

  // Determine final severity based on rule hits
  // Use the highest weight rule to determine severity
  const maxWeight = ruleHits.length > 0 
    ? Math.max(...ruleHits.map(r => r.weight))
    : 1;

  let severity: Severity;
  if (maxWeight >= 4) {
    severity = "RED";
  } else if (maxWeight >= 3) {
    severity = "ORANGE";
  } else if (maxWeight >= 2) {
    severity = "YELLOW";
  } else {
    severity = "GREEN";
  }

  // Generate rationale
  const rationale = generateRationale(patient, complaintCategory, ruleHits, severity);

  return {
    severity,
    ruleHits,
    rationale,
  };
}

/**
 * CHEST_PAIN evaluation rules
 * 
 * Clinical rationale:
 * - Crushing pain + radiation + SOB + diaphoresis = classic ACS pattern (RED)
 * - Geriatric patients: higher baseline risk, lower threshold for concern
 * - Females: atypical presentations (nausea, fatigue) still concerning
 * - Young adults with reproducible chest wall pain: lower concern (YELLOW)
 */
function evaluateChestPainRules(
  patient: TriageInput["patient"],
  answers: Record<string, unknown>,
  ruleHits: TriageRuleHit[]
): void {
  const { ageBracket, biologicalSex, ageAtVisit } = patient;
  const hasRadiation = answers.radiation === true || answers.radiation === "true";
  const hasSOB = answers.shortness_of_breath === true || answers.shortness_of_breath === "true";
  const hasDiaphoresis = answers.diaphoresis === true || answers.diaphoresis === "true";
  const hasNausea = answers.nausea === true || answers.nausea === "true";
  const hasExertion = answers.exertion === true || answers.exertion === "true";
  const isReproducible = answers.reproducible === true || answers.reproducible === "true";
  const severity = typeof answers.severity === "string" ? parseInt(answers.severity) : 0;
  const onsetTiming = answers.onset_timing as string;

  // RED: Classic ACS pattern (crushing + radiation + SOB + diaphoresis)
  if (hasRadiation && hasSOB && hasDiaphoresis && (onsetTiming === "JUST_NOW" || onsetTiming === "WITHIN_HOUR")) {
    ruleHits.push({
      id: "chest_pain_acs_classic",
      description: "Classic ACS pattern: crushing pain with radiation, SOB, and diaphoresis",
      weight: 4,
    });
    return;
  }

  // RED: Geriatric with concerning features
  if (ageBracket === "GERIATRIC" && (hasRadiation || hasSOB || hasDiaphoresis)) {
    ruleHits.push({
      id: "chest_pain_geriatric_high_risk",
      description: "Geriatric patient with concerning chest pain features",
      weight: 4,
    });
    return;
  }

  // RED: Adult/Geriatric with multiple red flags
  if ((ageBracket === "ADULT" || ageBracket === "GERIATRIC") && 
      hasRadiation && (hasSOB || hasDiaphoresis) && severity >= 7) {
    ruleHits.push({
      id: "chest_pain_multiple_flags",
      description: "Multiple concerning features: radiation + SOB/diaphoresis + high severity",
      weight: 4,
    });
    return;
  }

  // ORANGE: Female with atypical symptoms (still elevated concern)
  if (biologicalSex === "FEMALE" && (ageBracket === "ADULT" || ageBracket === "GERIATRIC") &&
      (hasNausea || hasSOB) && severity >= 6) {
    ruleHits.push({
      id: "chest_pain_female_atypical",
      description: "Female with atypical chest pain presentation (nausea/SOB) - elevated concern",
      weight: 3,
    });
    return;
  }

  // ORANGE: Adult/Geriatric with radiation or exertion
  if ((ageBracket === "ADULT" || ageBracket === "GERIATRIC") && 
      (hasRadiation || hasExertion) && severity >= 5) {
    ruleHits.push({
      id: "chest_pain_adult_radiation_exertion",
      description: "Adult/geriatric with radiation or exertion-related pain",
      weight: 3,
    });
    return;
  }

  // YELLOW: Young adult with reproducible chest wall pain
  if (ageBracket === "ADOLESCENT" || (ageBracket === "ADULT" && ageAtVisit < 50)) {
    if (isReproducible && !hasRadiation && !hasSOB && severity < 7) {
      ruleHits.push({
        id: "chest_pain_reproducible",
        description: "Reproducible chest wall pain without red flags",
        weight: 2,
      });
      return;
    }
  }

  // YELLOW: Moderate severity without red flags
  if (severity >= 5 && !hasRadiation && !hasSOB && !hasDiaphoresis) {
    ruleHits.push({
      id: "chest_pain_moderate",
      description: "Moderate severity chest pain without red flags",
      weight: 2,
    });
    return;
  }

  // Default: GREEN for low-severity, no red flags
  ruleHits.push({
    id: "chest_pain_low_severity",
    description: "Low-severity chest pain without concerning features",
    weight: 1,
  });
}

/**
 * BREATHING evaluation rules
 * 
 * Clinical rationale:
 * - Critical breathing difficulty (cannot speak) = RED
 * - Infants/children: higher concern due to smaller airways
 * - Sudden onset + chest pain = possible PE/MI (RED)
 * - Blue lips/nails = hypoxia (RED)
 */
function evaluateBreathingRules(
  patient: TriageInput["patient"],
  answers: Record<string, unknown>,
  ruleHits: TriageRuleHit[]
): void {
  const { ageBracket } = patient;
  const severityBreathing = answers.severity_breathing as string;
  const isSudden = answers.sudden_onset === true || answers.sudden_onset === "true";
  const hasChestPain = answers.chest_pain === true || answers.chest_pain === "true";
  const hasBlueLips = answers.blue_lips === true || answers.blue_lips === "true";

  // RED: Critical breathing difficulty
  if (severityBreathing === "CRITICAL" || hasBlueLips) {
    ruleHits.push({
      id: "breathing_critical",
      description: "Critical breathing difficulty or cyanosis",
      weight: 4,
    });
    return;
  }

  // RED: Sudden onset + chest pain (possible PE/MI)
  if (isSudden && hasChestPain) {
    ruleHits.push({
      id: "breathing_sudden_chest_pain",
      description: "Sudden onset breathing difficulty with chest pain - possible PE/MI",
      weight: 4,
    });
    return;
  }

  // RED: Infant/child with severe breathing difficulty
  if ((ageBracket === "INFANT" || ageBracket === "CHILD") && severityBreathing === "SEVERE") {
    ruleHits.push({
      id: "breathing_pediatric_severe",
      description: "Severe breathing difficulty in pediatric patient",
      weight: 4,
    });
    return;
  }

  // ORANGE: Severe breathing difficulty
  if (severityBreathing === "SEVERE") {
    ruleHits.push({
      id: "breathing_severe",
      description: "Severe breathing difficulty",
      weight: 3,
    });
    return;
  }

  // ORANGE: Moderate breathing difficulty in pediatric patient
  if ((ageBracket === "INFANT" || ageBracket === "CHILD") && severityBreathing === "MODERATE") {
    ruleHits.push({
      id: "breathing_pediatric_moderate",
      description: "Moderate breathing difficulty in pediatric patient",
      weight: 3,
    });
    return;
  }

  // YELLOW: Moderate breathing difficulty
  if (severityBreathing === "MODERATE") {
    ruleHits.push({
      id: "breathing_moderate",
      description: "Moderate breathing difficulty",
      weight: 2,
    });
    return;
  }

  // Default: GREEN
  ruleHits.push({
    id: "breathing_mild",
    description: "Mild breathing difficulty",
    weight: 1,
  });
}

/**
 * ABDOMINAL_PAIN evaluation rules
 * 
 * Clinical rationale:
 * - Sudden severe RLQ pain = possible appendicitis (ORANGE/RED)
 * - Female of childbearing age + sudden severe lower abdominal pain + pregnancy = ectopic concern (RED)
 * - Geriatric: higher concern for serious causes (AAA, mesenteric ischemia)
 * - Blood in stool/vomit = possible GI bleed (RED)
 */
function evaluateAbdominalPainRules(
  patient: TriageInput["patient"],
  answers: Record<string, unknown>,
  ruleHits: TriageRuleHit[]
): void {
  const { ageBracket, biologicalSex } = patient;
  const location = answers.location as string;
  const onsetType = answers.onset_type as string;
  const hasBlood = answers.blood_stool === true || answers.blood_stool === "true";
  const severity = typeof answers.severity === "string" ? parseInt(answers.severity) : 0;
  const isPregnant = answers.pregnancy === true || answers.pregnancy === "true";
  const hasVaginalBleeding = answers.vaginal_bleeding === true || answers.vaginal_bleeding === "true";

  // RED: Blood in stool/vomit
  if (hasBlood) {
    ruleHits.push({
      id: "abdominal_bleeding",
      description: "Blood in stool or vomit - possible GI bleed",
      weight: 4,
    });
    return;
  }

  // RED: Female of childbearing age + sudden severe lower abdominal pain + pregnancy concern
  if (biologicalSex === "FEMALE" && 
      (ageBracket === "ADOLESCENT" || ageBracket === "ADULT") &&
      onsetType === "SUDDEN" && 
      severity >= 8 &&
      (location === "RLQ" || location === "LLQ" || location === "GENERALIZED") &&
      (isPregnant || hasVaginalBleeding)) {
    ruleHits.push({
      id: "abdominal_ectopic_concern",
      description: "Sudden severe lower abdominal pain in female of childbearing age with pregnancy concern - possible ectopic",
      weight: 4,
    });
    return;
  }

  // RED: Geriatric with sudden severe pain
  if (ageBracket === "GERIATRIC" && onsetType === "SUDDEN" && severity >= 7) {
    ruleHits.push({
      id: "abdominal_geriatric_sudden_severe",
      description: "Sudden severe abdominal pain in geriatric patient - high concern for serious cause",
      weight: 4,
    });
    return;
  }

  // ORANGE: Sudden severe RLQ pain (possible appendicitis)
  if (location === "RLQ" && onsetType === "SUDDEN" && severity >= 7) {
    ruleHits.push({
      id: "abdominal_rlq_sudden_severe",
      description: "Sudden severe right lower quadrant pain - possible appendicitis",
      weight: 3,
    });
    return;
  }

  // ORANGE: Sudden severe pain in any location
  if (onsetType === "SUDDEN" && severity >= 7) {
    ruleHits.push({
      id: "abdominal_sudden_severe",
      description: "Sudden severe abdominal pain",
      weight: 3,
    });
    return;
  }

  // YELLOW: Moderate severity with concerning features
  if (severity >= 5 && (answers.vomiting === true || answers.fever === true)) {
    ruleHits.push({
      id: "abdominal_moderate_concerning",
      description: "Moderate abdominal pain with vomiting or fever",
      weight: 2,
    });
    return;
  }

  // Default: GREEN
  ruleHits.push({
    id: "abdominal_low_severity",
    description: "Low-severity abdominal pain without concerning features",
    weight: 1,
  });
}

/**
 * FEVER evaluation rules
 * 
 * Clinical rationale:
 * - Infants < 3 months: any fever > 100.4°F = high concern (RED)
 * - Children: fever + lethargy + poor hydration = high concern (RED)
 * - Geriatric: moderate fever + confusion = high concern (RED)
 * - Stiff neck + fever = possible meningitis (RED)
 */
function evaluateFeverRules(
  patient: TriageInput["patient"],
  answers: Record<string, unknown>,
  ruleHits: TriageRuleHit[]
): void {
  const { ageBracket, ageAtVisit } = patient;
  
  // Parse temperature from CHOICE format (string values like "101", "102", "UNKNOWN")
  const tempString = answers.max_temperature as string;
  let maxTemp = 0;
  if (tempString && tempString !== "UNKNOWN") {
    maxTemp = parseFloat(tempString);
  }
  
  const hasLethargy = answers.lethargy === true || answers.lethargy === "true";
  const hasPoorHydration = answers.hydration === false || answers.hydration === "false";
  const hasWetDiapers = answers.wet_diapers === true || answers.wet_diapers === "true";
  const hasStiffNeck = answers.stiff_neck === true || answers.stiff_neck === "true";
  const hasConfusion = answers.confusion === true || answers.confusion === "true";
  const hasBreathingDifficulty = answers.breathing_difficulty === true || answers.breathing_difficulty === "true";

  // RED: Infant < 3 months with any fever > 100.4°F
  if (ageBracket === "INFANT" && ageAtVisit < 0.25 && maxTemp > 100.4) {
    ruleHits.push({
      id: "fever_infant_high_risk",
      description: "Infant < 3 months with fever > 100.4°F - high concern for serious infection",
      weight: 4,
    });
    return;
  }

  // RED: Stiff neck + fever (possible meningitis)
  if (hasStiffNeck && maxTemp > 100.4) {
    ruleHits.push({
      id: "fever_meningitis_concern",
      description: "Fever with stiff neck - possible meningitis",
      weight: 4,
    });
    return;
  }

  // RED: Pediatric fever + lethargy + poor hydration
  if ((ageBracket === "INFANT" || ageBracket === "CHILD") && 
      maxTemp > 102 && hasLethargy && (hasPoorHydration || !hasWetDiapers)) {
    ruleHits.push({
      id: "fever_pediatric_severe",
      description: "High fever with lethargy and poor hydration in pediatric patient",
      weight: 4,
    });
    return;
  }

  // RED: Geriatric with moderate fever + confusion
  if (ageBracket === "GERIATRIC" && maxTemp > 100.4 && hasConfusion) {
    ruleHits.push({
      id: "fever_geriatric_confusion",
      description: "Fever with confusion in geriatric patient - high concern for infection",
      weight: 4,
    });
    return;
  }

  // ORANGE: High fever (> 103°F) in any age
  if (maxTemp > 103) {
    ruleHits.push({
      id: "fever_high",
      description: "High fever (> 103°F)",
      weight: 3,
    });
    return;
  }

  // ORANGE: Pediatric fever + lethargy
  if ((ageBracket === "INFANT" || ageBracket === "CHILD") && maxTemp > 101 && hasLethargy) {
    ruleHits.push({
      id: "fever_pediatric_lethargy",
      description: "Fever with lethargy in pediatric patient",
      weight: 3,
    });
    return;
  }

  // YELLOW: Moderate fever with concerning features
  if (maxTemp > 100.4 && (hasBreathingDifficulty || hasLethargy)) {
    ruleHits.push({
      id: "fever_moderate_concerning",
      description: "Moderate fever with concerning features",
      weight: 2,
    });
    return;
  }

  // Default: GREEN for low-grade or no concerning features
  ruleHits.push({
    id: "fever_low_grade",
    description: "Low-grade fever without concerning features",
    weight: 1,
  });
}

/**
 * NEURO evaluation rules
 * 
 * Clinical rationale:
 * - Stroke-like symptoms with sudden onset = time-critical (RED)
 * - Ongoing seizure = status epilepticus (RED)
 * - "Worst headache of life" = possible SAH (RED)
 */
function evaluateNeuroRules(
  patient: TriageInput["patient"],
  answers: Record<string, unknown>,
  ruleHits: TriageRuleHit[]
): void {
  const symptomType = answers.symptom_type as string;
  const hasDifficultySpeaking = answers.difficulty_speaking === true || answers.difficulty_speaking === "true";
  const hasWeaknessOneSide = answers.weakness_one_side === true || answers.weakness_one_side === "true";
  const hasFacialDrooping = answers.facial_drooping === true || answers.facial_drooping === "true";
  const isSudden = answers.sudden_onset === true || answers.sudden_onset === "true";
  const seizureDuration = answers.seizure_duration as string;
  const isWorstHeadache = answers.headache_severity === true || answers.headache_severity === "true";

  // RED: Stroke-like symptoms with sudden onset
  if (symptomType === "STROKE_LIKE" && isSudden && 
      (hasDifficultySpeaking || hasWeaknessOneSide || hasFacialDrooping)) {
    ruleHits.push({
      id: "neuro_stroke_like",
      description: "Sudden onset stroke-like symptoms - time-critical",
      weight: 4,
    });
    return;
  }

  // RED: Ongoing seizure or seizure > 5 minutes
  if (symptomType === "SEIZURE" && 
      (seizureDuration === "ONGOING" || seizureDuration === "MORE_5_MINUTES")) {
    ruleHits.push({
      id: "neuro_status_epilepticus",
      description: "Ongoing or prolonged seizure - possible status epilepticus",
      weight: 4,
    });
    return;
  }

  // RED: "Worst headache of life" (possible SAH)
  if (symptomType === "HEADACHE" && isWorstHeadache && isSudden) {
    ruleHits.push({
      id: "neuro_worst_headache",
      description: "Sudden worst headache of life - possible subarachnoid hemorrhage",
      weight: 4,
    });
    return;
  }

  // ORANGE: Stroke-like symptoms without sudden onset
  if (symptomType === "STROKE_LIKE" && 
      (hasDifficultySpeaking || hasWeaknessOneSide || hasFacialDrooping)) {
    ruleHits.push({
      id: "neuro_stroke_like_delayed",
      description: "Stroke-like symptoms - urgent evaluation needed",
      weight: 3,
    });
    return;
  }

  // ORANGE: Seizure
  if (symptomType === "SEIZURE") {
    ruleHits.push({
      id: "neuro_seizure",
      description: "Seizure - requires evaluation",
      weight: 3,
    });
    return;
  }

  // YELLOW: Confusion or altered mental status
  if (symptomType === "CONFUSION") {
    ruleHits.push({
      id: "neuro_confusion",
      description: "Confusion or altered mental status",
      weight: 2,
    });
    return;
  }

  // Default: GREEN
  ruleHits.push({
    id: "neuro_mild",
    description: "Mild neurological symptoms",
    weight: 1,
  });
}

/**
 * TRAUMA evaluation rules
 * 
 * Clinical rationale:
 * - Loss of consciousness = possible head injury (RED)
 * - Neck/back pain after trauma = possible spinal injury (RED)
 * - Geriatric fall = higher concern (ORANGE/RED)
 */
function evaluateTraumaRules(
  patient: TriageInput["patient"],
  answers: Record<string, unknown>,
  ruleHits: TriageRuleHit[]
): void {
  const { ageBracket } = patient;
  const hasLOC = answers.loss_of_consciousness === true || answers.loss_of_consciousness === "true";
  const hasNeckPain = answers.neck_pain === true || answers.neck_pain === "true";
  const hasBackPain = answers.back_pain === true || answers.back_pain === "true";
  const mechanism = answers.mechanism as string;
  const fallHeight = answers.fall_height as string;

  // RED: Loss of consciousness
  if (hasLOC) {
    ruleHits.push({
      id: "trauma_loc",
      description: "Loss of consciousness - possible head injury",
      weight: 4,
    });
    return;
  }

  // RED: Neck or back pain after trauma (possible spinal injury)
  if (hasNeckPain || hasBackPain) {
    ruleHits.push({
      id: "trauma_spinal_concern",
      description: "Neck or back pain after trauma - possible spinal injury",
      weight: 4,
    });
    return;
  }

  // RED: Geriatric fall from height
  if (ageBracket === "GERIATRIC" && mechanism === "FALL" && fallHeight === "HEIGHT") {
    ruleHits.push({
      id: "trauma_geriatric_fall_height",
      description: "Geriatric patient fell from height - high concern",
      weight: 4,
    });
    return;
  }

  // ORANGE: Geriatric fall (any)
  if (ageBracket === "GERIATRIC" && mechanism === "FALL") {
    ruleHits.push({
      id: "trauma_geriatric_fall",
      description: "Geriatric patient with fall - elevated concern",
      weight: 3,
    });
    return;
  }

  // ORANGE: MVC or assault
  if (mechanism === "MVC" || mechanism === "ASSAULT") {
    ruleHits.push({
      id: "trauma_high_energy",
      description: "High-energy mechanism (MVC or assault)",
      weight: 3,
    });
    return;
  }

  // YELLOW: Other trauma
  ruleHits.push({
    id: "trauma_moderate",
    description: "Moderate trauma without red flags",
    weight: 2,
  });
}

/**
 * PSYCH evaluation rules
 * 
 * Clinical rationale:
 * - Suicidal intent with plan = immediate concern (RED)
 * - Homicidal intent = immediate concern (RED)
 */
function evaluatePsychRules(
  patient: TriageInput["patient"],
  answers: Record<string, unknown>,
  ruleHits: TriageRuleHit[]
): void {
  const symptomType = answers.symptom_type as string;
  const hasSuicidalIntent = answers.suicidal_intent === true || answers.suicidal_intent === "true";
  const hasHomicidalIntent = answers.homicidal_intent === true || answers.homicidal_intent === "true";

  // RED: Suicidal intent with plan
  if (symptomType === "SUICIDAL" && hasSuicidalIntent) {
    ruleHits.push({
      id: "psych_suicidal_plan",
      description: "Suicidal thoughts with plan - immediate concern",
      weight: 4,
    });
    return;
  }

  // RED: Homicidal intent
  if (hasHomicidalIntent) {
    ruleHits.push({
      id: "psych_homicidal",
      description: "Homicidal thoughts - immediate concern",
      weight: 4,
    });
    return;
  }

  // ORANGE: Suicidal thoughts without plan
  if (symptomType === "SUICIDAL") {
    ruleHits.push({
      id: "psych_suicidal_thoughts",
      description: "Suicidal thoughts - urgent evaluation",
      weight: 3,
    });
    return;
  }

  // ORANGE: Agitation or psychosis
  if (symptomType === "AGITATION" || symptomType === "PSYCHOSIS") {
    ruleHits.push({
      id: "psych_agitation_psychosis",
      description: "Agitation or psychosis - requires evaluation",
      weight: 3,
    });
    return;
  }

  // YELLOW: Other psychiatric concerns
  ruleHits.push({
    id: "psych_other",
    description: "Other psychiatric concerns",
    weight: 2,
  });
}

/**
 * Generate human-readable rationale for triage result
 */
function generateRationale(
  patient: TriageInput["patient"],
  complaintCategory: ChiefComplaintCategory,
  ruleHits: TriageRuleHit[],
  severity: Severity
): string {
  const { ageAtVisit, ageBracket, biologicalSex } = patient;
  const ageDesc = ageBracket === "INFANT" 
    ? `${Math.round(ageAtVisit * 12)}-month-old`
    : ageBracket === "CHILD"
      ? `${Math.round(ageAtVisit)}-year-old child`
      : ageBracket === "ADOLESCENT"
        ? `${Math.round(ageAtVisit)}-year-old adolescent`
        : ageBracket === "GERIATRIC"
          ? `${Math.round(ageAtVisit)}-year-old geriatric`
          : `${Math.round(ageAtVisit)}-year-old adult`;

  const sexDesc = biologicalSex === "MALE" ? "male" : biologicalSex === "FEMALE" ? "female" : "patient";

  const primaryRule = ruleHits.length > 0 
    ? ruleHits.reduce((max, r) => r.weight > max.weight ? r : max)
    : null;

  if (primaryRule) {
    return `${ageDesc} ${sexDesc} with ${complaintCategory.toLowerCase().replace(/_/g, " ")}. ${primaryRule.description}. Assigned ${severity} severity.`;
  }

  return `${ageDesc} ${sexDesc} with ${complaintCategory.toLowerCase().replace(/_/g, " ")}. Assigned ${severity} severity.`;
}

