/**
 * Complaint configuration with age-aware and sex-aware question definitions
 * 
 * Each complaint category includes:
 * - Display labels
 * - Optional subtypes (e.g., chest pain types)
 * - Question definitions with conditional display logic based on age/sex
 */

import type {
  ComplaintConfig,
  QuestionDefinition,
  TriagePatientContext,
  ChiefComplaintCategory,
} from './types';

/**
 * CHEST_PAIN complaint configuration
 * 
 * Age considerations:
 * - Younger adults (< 50) with chest pain: lower threshold for cardiac workup if risk factors present
 * - Geriatric patients: higher baseline risk, atypical presentations more common
 * 
 * Sex considerations:
 * - Females may present with atypical symptoms (nausea, fatigue, back pain)
 * - Atypical presentations should still trigger elevated concern
 */
export const CHEST_PAIN_CONFIG: ComplaintConfig = {
  id: "CHEST_PAIN",
  displayLabel: "Chest Pain",
  subtypes: [
    { id: "CRUSHING_PRESSURE", label: "Crushing or pressure" },
    { id: "SHARP_STABBING", label: "Sharp or stabbing" },
    { id: "BURNING", label: "Burning sensation" },
    { id: "ACHE", label: "Ache or discomfort" },
  ],
  questions: [
    {
      id: "onset_timing",
      label: "When did the pain start?",
      type: "CHOICE",
      options: [
        { value: "JUST_NOW", label: "Just now (minutes ago)" },
        { value: "WITHIN_HOUR", label: "Within the last hour" },
        { value: "FEW_HOURS", label: "A few hours ago" },
        { value: "TODAY", label: "Earlier today" },
        { value: "DAYS", label: "Days ago" },
      ],
    },
    {
      id: "radiation",
      label: "Does the pain radiate to your arm, neck, jaw, or back?",
      type: "BOOLEAN",
    },
    {
      id: "shortness_of_breath",
      label: "Are you short of breath?",
      type: "BOOLEAN",
    },
    {
      id: "diaphoresis",
      label: "Are you sweating or having cold sweats?",
      type: "BOOLEAN",
    },
    {
      id: "nausea",
      label: "Are you experiencing nausea or vomiting?",
      type: "BOOLEAN",
    },
    {
      id: "exertion",
      label: "Does the pain worsen with physical activity?",
      type: "BOOLEAN",
    },
    {
      id: "severity",
      label: "How severe is the pain? (1-10)",
      type: "SCALE",
      options: Array.from({ length: 10 }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1}${i === 0 ? " - Mild" : i === 4 ? " - Moderate" : i === 9 ? " - Severe" : ""}`,
      })),
    },
    {
      id: "reproducible",
      label: "Can you reproduce the pain by pressing on your chest?",
      type: "BOOLEAN",
      showIf: (ctx) => ctx.ageBracket === "ADOLESCENT" || ctx.ageBracket === "ADULT",
    },
  ],
};

/**
 * BREATHING complaint configuration
 * 
 * Age considerations:
 * - Infants/children: higher concern for respiratory distress (smaller airways)
 * - Geriatric: baseline respiratory issues more common, but new onset still concerning
 * 
 * Sex considerations:
 * - Pregnancy-related dyspnea only for females of childbearing age
 */
export const BREATHING_CONFIG: ComplaintConfig = {
  id: "BREATHING",
  displayLabel: "Trouble Breathing",
  subtypes: [
    { id: "SHORTNESS_BREATH", label: "Shortness of breath" },
    { id: "WHEEZING", label: "Wheezing" },
    { id: "CHOKING", label: "Choking or unable to breathe" },
  ],
  questions: [
    {
      id: "severity_breathing",
      label: "How severe is your breathing difficulty?",
      type: "CHOICE",
      options: [
        { value: "MILD", label: "Mild - can speak in full sentences" },
        { value: "MODERATE", label: "Moderate - can speak in short phrases" },
        { value: "SEVERE", label: "Severe - can only say a few words" },
        { value: "CRITICAL", label: "Critical - cannot speak" },
      ],
    },
    {
      id: "sudden_onset",
      label: "Did this start suddenly?",
      type: "BOOLEAN",
    },
    {
      id: "chest_pain",
      label: "Do you have chest pain?",
      type: "BOOLEAN",
    },
    {
      id: "fever",
      label: "Do you have a fever?",
      type: "BOOLEAN",
    },
    {
      id: "cough",
      label: "Do you have a cough?",
      type: "BOOLEAN",
    },
    {
      id: "wheezing",
      label: "Are you wheezing?",
      type: "BOOLEAN",
    },
    {
      id: "blue_lips",
      label: "Are your lips or fingernails blue?",
      type: "BOOLEAN",
    },
    {
      id: "pregnancy_related",
      label: "Could this be related to pregnancy?",
      type: "BOOLEAN",
      showIf: (ctx) =>
        ctx.biologicalSex === "FEMALE" &&
        (ctx.ageBracket === "ADOLESCENT" || ctx.ageBracket === "ADULT"),
    },
  ],
};

/**
 * ABDOMINAL_PAIN complaint configuration
 * 
 * Age considerations:
 * - Infants/children: appendicitis, intussusception concerns
 * - Geriatric: higher concern for serious causes (AAA, mesenteric ischemia)
 * 
 * Sex considerations:
 * - Females of childbearing age: ectopic pregnancy, ovarian torsion concerns
 * - Pregnancy-related questions only for appropriate age/sex
 */
export const ABDOMINAL_PAIN_CONFIG: ComplaintConfig = {
  id: "ABDOMINAL_PAIN",
  displayLabel: "Abdominal Pain",
  subtypes: [
    { id: "RLQ", label: "Right lower quadrant" },
    { id: "LLQ", label: "Left lower quadrant" },
    { id: "RUQ", label: "Right upper quadrant" },
    { id: "LUQ", label: "Left upper quadrant" },
    { id: "EPIGASTRIC", label: "Upper middle (epigastric)" },
    { id: "GENERALIZED", label: "Generalized/whole abdomen" },
  ],
  questions: [
    {
      id: "location",
      label: "Where is the pain located?",
      type: "CHOICE",
      options: [
        { value: "RLQ", label: "Right lower quadrant" },
        { value: "LLQ", label: "Left lower quadrant" },
        { value: "RUQ", label: "Right upper quadrant" },
        { value: "LUQ", label: "Left upper quadrant" },
        { value: "EPIGASTRIC", label: "Upper middle" },
        { value: "GENERALIZED", label: "All over" },
      ],
    },
    {
      id: "onset_type",
      label: "How did the pain start?",
      type: "CHOICE",
      options: [
        { value: "SUDDEN", label: "Sudden (like a switch flipped)" },
        { value: "GRADUAL", label: "Gradual (came on slowly)" },
      ],
    },
    {
      id: "vomiting",
      label: "Are you vomiting?",
      type: "BOOLEAN",
    },
    {
      id: "diarrhea",
      label: "Do you have diarrhea?",
      type: "BOOLEAN",
    },
    {
      id: "blood_stool",
      label: "Is there blood in your stool or vomit?",
      type: "BOOLEAN",
    },
    {
      id: "fever",
      label: "Do you have a fever?",
      type: "BOOLEAN",
    },
    {
      id: "severity",
      label: "How severe is the pain? (1-10)",
      type: "SCALE",
      options: Array.from({ length: 10 }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1}${i === 0 ? " - Mild" : i === 4 ? " - Moderate" : i === 9 ? " - Severe" : ""}`,
      })),
    },
    {
      id: "pregnancy",
      label: "Could you be pregnant?",
      type: "BOOLEAN",
      showIf: (ctx) =>
        ctx.biologicalSex === "FEMALE" &&
        (ctx.ageBracket === "ADOLESCENT" || ctx.ageBracket === "ADULT"),
    },
    {
      id: "vaginal_bleeding",
      label: "Do you have vaginal bleeding?",
      type: "BOOLEAN",
      showIf: (ctx) =>
        ctx.biologicalSex === "FEMALE" &&
        (ctx.ageBracket === "ADOLESCENT" || ctx.ageBracket === "ADULT"),
    },
  ],
};

/**
 * FEVER complaint configuration
 * 
 * Age considerations:
 * - Infants (< 3 months): any fever > 100.4°F is high concern
 * - Children (3 months - 3 years): fever thresholds differ, lethargy/hydration critical
 * - Geriatric: lower baseline, moderate fever + confusion = high concern
 * 
 * Sex considerations:
 * - Generally minimal, but pregnancy-related fever concerns for females
 */
export const FEVER_CONFIG: ComplaintConfig = {
  id: "FEVER",
  displayLabel: "Fever",
  questions: [
    {
      id: "max_temperature",
      label: "What is the highest temperature you've measured?",
      type: "CHOICE",
      options: [
        { value: "98", label: "98°F or below (No fever)" },
        { value: "99", label: "99°F (Low-grade)" },
        { value: "100", label: "100°F" },
        { value: "101", label: "101°F" },
        { value: "102", label: "102°F" },
        { value: "103", label: "103°F" },
        { value: "104", label: "104°F" },
        { value: "105", label: "105°F or higher (Very high)" },
        { value: "UNKNOWN", label: "Don't know / Haven't measured" },
      ],
    },
    {
      id: "duration",
      label: "How long have you had the fever?",
      type: "CHOICE",
      options: [
        { value: "HOURS", label: "A few hours" },
        { value: "TODAY", label: "Since today" },
        { value: "1_2_DAYS", label: "1-2 days" },
        { value: "3_5_DAYS", label: "3-5 days" },
        { value: "WEEK_PLUS", label: "More than a week" },
      ],
    },
    {
      id: "lethargy",
      label: "Are you unusually sleepy or hard to wake?",
      type: "BOOLEAN",
    },
    {
      id: "hydration",
      label: "Are you able to drink fluids?",
      type: "BOOLEAN",
    },
    {
      id: "wet_diapers",
      label: "Wet diapers in the last 6 hours? (for infants/children)",
      type: "BOOLEAN",
      showIf: (ctx) => ctx.ageBracket === "INFANT" || ctx.ageBracket === "CHILD",
    },
    {
      id: "rash",
      label: "Do you have a rash?",
      type: "BOOLEAN",
    },
    {
      id: "stiff_neck",
      label: "Do you have a stiff neck or neck pain?",
      type: "BOOLEAN",
    },
    {
      id: "breathing_difficulty",
      label: "Are you having trouble breathing?",
      type: "BOOLEAN",
    },
    {
      id: "confusion",
      label: "Are you confused or not thinking clearly?",
      type: "BOOLEAN",
      showIf: (ctx) => ctx.ageBracket === "ADULT" || ctx.ageBracket === "GERIATRIC",
    },
  ],
};

/**
 * NEURO complaint configuration (stroke/TIA, seizure, confusion)
 * 
 * Age considerations:
 * - Stroke risk increases with age, but can occur at any age
 * - Seizures in infants/children: different etiologies
 * - Confusion in geriatric: higher baseline, but new onset still concerning
 * 
 * Sex considerations:
 * - Stroke risk factors may differ by sex
 */
export const NEURO_CONFIG: ComplaintConfig = {
  id: "NEURO",
  displayLabel: "Neurological Symptoms",
  subtypes: [
    { id: "STROKE_LIKE", label: "Stroke-like symptoms" },
    { id: "SEIZURE", label: "Seizure" },
    { id: "CONFUSION", label: "Confusion or altered mental status" },
    { id: "HEADACHE", label: "Severe headache" },
  ],
  questions: [
    {
      id: "symptom_type",
      label: "What neurological symptom are you experiencing?",
      type: "CHOICE",
      options: [
        { value: "STROKE_LIKE", label: "Stroke-like (weakness, speech problems, vision)" },
        { value: "SEIZURE", label: "Seizure" },
        { value: "CONFUSION", label: "Confusion or altered thinking" },
        { value: "HEADACHE", label: "Severe headache" },
      ],
    },
    {
      id: "difficulty_speaking",
      label: "Are you having difficulty speaking or understanding speech?",
      type: "BOOLEAN",
    },
    {
      id: "weakness_one_side",
      label: "Do you have weakness or numbness on one side of your body?",
      type: "BOOLEAN",
    },
    {
      id: "facial_drooping",
      label: "Is one side of your face drooping?",
      type: "BOOLEAN",
    },
    {
      id: "vision_problems",
      label: "Are you having vision problems or double vision?",
      type: "BOOLEAN",
    },
    {
      id: "loss_of_balance",
      label: "Are you having trouble with balance or coordination?",
      type: "BOOLEAN",
    },
    {
      id: "sudden_onset",
      label: "Did these symptoms start suddenly?",
      type: "BOOLEAN",
    },
    {
      id: "seizure_duration",
      label: "How long did the seizure last? (if applicable)",
      type: "CHOICE",
      options: [
        { value: "LESS_MINUTE", label: "Less than 1 minute" },
        { value: "1_5_MINUTES", label: "1-5 minutes" },
        { value: "MORE_5_MINUTES", label: "More than 5 minutes" },
        { value: "ONGOING", label: "Still ongoing" },
      ],
      showIf: (ctx, answers) => answers.symptom_type === "SEIZURE",
    },
    {
      id: "headache_severity",
      label: "Is this the worst headache of your life?",
      type: "BOOLEAN",
      showIf: (ctx, answers) => answers.symptom_type === "HEADACHE",
    },
    {
      id: "neck_stiffness",
      label: "Do you have neck stiffness?",
      type: "BOOLEAN",
      showIf: (ctx, answers) => answers.symptom_type === "HEADACHE",
    },
  ],
};

/**
 * TRAUMA complaint configuration
 * 
 * Age considerations:
 * - Geriatric: falls are high-risk, lower threshold for imaging
 * - Children: mechanism of injury important (abuse concerns)
 * 
 * Sex considerations:
 * - Generally minimal for trauma
 */
export const TRAUMA_CONFIG: ComplaintConfig = {
  id: "TRAUMA",
  displayLabel: "Injury or Trauma",
  subtypes: [
    { id: "FALL", label: "Fall" },
    { id: "MVC", label: "Motor vehicle crash" },
    { id: "ASSAULT", label: "Assault" },
    { id: "SPORTS", label: "Sports injury" },
  ],
  questions: [
    {
      id: "mechanism",
      label: "How did the injury occur?",
      type: "CHOICE",
      options: [
        { value: "FALL", label: "Fall" },
        { value: "MVC", label: "Motor vehicle crash" },
        { value: "ASSAULT", label: "Assault" },
        { value: "SPORTS", label: "Sports injury" },
        { value: "OTHER", label: "Other" },
      ],
    },
    {
      id: "loss_of_consciousness",
      label: "Did you lose consciousness?",
      type: "BOOLEAN",
    },
    {
      id: "neck_pain",
      label: "Do you have neck pain?",
      type: "BOOLEAN",
    },
    {
      id: "back_pain",
      label: "Do you have back pain?",
      type: "BOOLEAN",
    },
    {
      id: "bleeding",
      label: "Are you bleeding?",
      type: "BOOLEAN",
    },
    {
      id: "difficulty_moving",
      label: "Are you having difficulty moving any body part?",
      type: "BOOLEAN",
    },
    {
      id: "fall_height",
      label: "How far did you fall? (if applicable)",
      type: "CHOICE",
      options: [
        { value: "GROUND", label: "From ground level" },
        { value: "STAIRS", label: "Down stairs" },
        { value: "HEIGHT", label: "From a height" },
      ],
      showIf: (ctx, answers) => answers.mechanism === "FALL",
    },
  ],
};

/**
 * PSYCH complaint configuration
 * 
 * Age considerations:
 * - Adolescents: higher baseline for behavioral concerns
 * - Geriatric: new-onset psychiatric symptoms may indicate medical cause
 * 
 * Sex considerations:
 * - Generally minimal, but some conditions have sex-specific presentations
 */
export const PSYCH_CONFIG: ComplaintConfig = {
  id: "PSYCH",
  displayLabel: "Psychiatric or Behavioral",
  subtypes: [
    { id: "SUICIDAL", label: "Suicidal thoughts" },
    { id: "AGITATION", label: "Agitation or aggression" },
    { id: "PSYCHOSIS", label: "Psychosis or hallucinations" },
    { id: "DEPRESSION", label: "Severe depression" },
  ],
  questions: [
    {
      id: "symptom_type",
      label: "What is the main concern?",
      type: "CHOICE",
      options: [
        { value: "SUICIDAL", label: "Suicidal thoughts or intent" },
        { value: "AGITATION", label: "Agitation or aggression" },
        { value: "PSYCHOSIS", label: "Psychosis or hallucinations" },
        { value: "DEPRESSION", label: "Severe depression" },
        { value: "OTHER", label: "Other" },
      ],
    },
    {
      id: "suicidal_intent",
      label: "Do you have a plan to harm yourself?",
      type: "BOOLEAN",
      showIf: (ctx, answers) => answers.symptom_type === "SUICIDAL",
    },
    {
      id: "homicidal_intent",
      label: "Do you have thoughts of harming others?",
      type: "BOOLEAN",
    },
    {
      id: "hallucinations",
      label: "Are you seeing or hearing things that aren't there?",
      type: "BOOLEAN",
      showIf: (ctx, answers) => answers.symptom_type === "PSYCHOSIS",
    },
    {
      id: "recent_stress",
      label: "Have you experienced recent major stress or trauma?",
      type: "BOOLEAN",
    },
  ],
};

/**
 * OTHER complaint configuration
 * Catch-all for complaints not covered by specific categories
 */
export const OTHER_CONFIG: ComplaintConfig = {
  id: "OTHER",
  displayLabel: "Other",
  questions: [
    {
      id: "symptom_category",
      label: "What type of symptom are you experiencing?",
      type: "CHOICE",
      options: [
        { value: "PAIN", label: "Pain or discomfort" },
        { value: "SKIN", label: "Skin problem or rash" },
        { value: "DIGESTIVE", label: "Digestive issue" },
        { value: "URINARY", label: "Urinary problem" },
        { value: "EYE_EAR", label: "Eye or ear problem" },
        { value: "WEAKNESS", label: "Weakness or fatigue" },
        { value: "OTHER_SYMPTOM", label: "Something else" },
      ],
    },
    {
      id: "when_started",
      label: "When did this start?",
      type: "CHOICE",
      options: [
        { value: "JUST_NOW", label: "Just now (minutes ago)" },
        { value: "TODAY", label: "Earlier today" },
        { value: "YESTERDAY", label: "Yesterday" },
        { value: "FEW_DAYS", label: "A few days ago" },
        { value: "WEEK_PLUS", label: "More than a week ago" },
      ],
    },
    {
      id: "severity_general",
      label: "How severe is your symptom? (1-10)",
      type: "SCALE",
      options: Array.from({ length: 10 }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1}${i === 0 ? " - Mild" : i === 4 ? " - Moderate" : i === 9 ? " - Severe" : ""}`,
      })),
    },
    {
      id: "getting_worse",
      label: "Is it getting worse over time?",
      type: "BOOLEAN",
    },
    {
      id: "constant_intermittent",
      label: "Is the symptom constant or does it come and go?",
      type: "CHOICE",
      options: [
        { value: "CONSTANT", label: "Constant" },
        { value: "INTERMITTENT", label: "Comes and goes" },
      ],
    },
  ],
};

/**
 * Map of all complaint configurations
 * Used by the triage engine to look up complaint-specific rules
 */
export const COMPLAINT_CONFIGS: Record<ChiefComplaintCategory, ComplaintConfig> = {
  CHEST_PAIN: CHEST_PAIN_CONFIG,
  BREATHING: BREATHING_CONFIG,
  ABDOMINAL_PAIN: ABDOMINAL_PAIN_CONFIG,
  FEVER: FEVER_CONFIG,
  NEURO: NEURO_CONFIG,
  TRAUMA: TRAUMA_CONFIG,
  PSYCH: PSYCH_CONFIG,
  OTHER: OTHER_CONFIG,
};

/**
 * Get complaint configuration by category
 */
export function getComplaintConfig(category: ChiefComplaintCategory): ComplaintConfig {
  return COMPLAINT_CONFIGS[category] || OTHER_CONFIG;
}

/**
 * Get all available complaint categories for UI display
 */
export function getAllComplaintCategories(): ComplaintConfig[] {
  return Object.values(COMPLAINT_CONFIGS);
}

