/**
 * Symptom question configuration for dynamic intake flow
 * 
 * Each chief complaint category has a set of relevant questions
 * that help assess risk and guide provisional EWS calculation.
 */

export interface SymptomQuestion {
  id: string
  label: string
  type: 'yesno' | 'scale' | 'text'
  required?: boolean
  options?: Array<{ value: string; label: string }> // For scale questions
}

export interface ComplaintCategory {
  id: string
  label: string
  questions: SymptomQuestion[]
}

/**
 * Symptom questions by chief complaint category
 */
export const SYMPTOM_QUESTIONS: Record<string, ComplaintCategory> = {
  'Chest Pain': {
    id: 'Chest Pain',
    label: 'Chest Pain',
    questions: [
      {
        id: 'radiatingPain',
        label: 'Does the pain radiate to your arm, neck, or jaw?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'chestPainWithExertion',
        label: 'Does the pain worsen with physical activity?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'chestPainWithNausea',
        label: 'Are you experiencing nausea or vomiting?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'chestPainWithSweating',
        label: 'Are you sweating or having cold sweats?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'suddenOnset',
        label: 'Did the pain start suddenly?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'shortnessOfBreath',
        label: 'Are you short of breath?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'painSeverity',
        label: 'How severe is the pain? (1-10)',
        type: 'scale',
        required: false,
        options: [
          { value: '1', label: '1 - Mild' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5 - Moderate' },
          { value: '6', label: '6' },
          { value: '7', label: '7' },
          { value: '8', label: '8' },
          { value: '9', label: '9' },
          { value: '10', label: '10 - Severe' },
        ],
      },
    ],
  },
  'Shortness of Breath': {
    id: 'Shortness of Breath',
    label: 'Shortness of Breath',
    questions: [
      {
        id: 'severeShortnessOfBreath',
        label: 'Are you having severe difficulty breathing?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'difficultyBreathing',
        label: 'Is it hard to speak in full sentences?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'chestPain',
        label: 'Do you have chest pain?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'fever',
        label: 'Do you have a fever?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'cough',
        label: 'Do you have a cough?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'wheezing',
        label: 'Are you wheezing?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'suddenOnset',
        label: 'Did this start suddenly?',
        type: 'yesno',
        required: false,
      },
    ],
  },
  'Abdominal Pain': {
    id: 'Abdominal Pain',
    label: 'Abdominal Pain',
    questions: [
      {
        id: 'painLocation',
        label: 'Where is the pain located?',
        type: 'text',
        required: false,
      },
      {
        id: 'nausea',
        label: 'Are you experiencing nausea or vomiting?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'fever',
        label: 'Do you have a fever?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'bloodInStool',
        label: 'Is there blood in your stool or vomit?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'painSeverity',
        label: 'How severe is the pain? (1-10)',
        type: 'scale',
        required: false,
        options: [
          { value: '1', label: '1 - Mild' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5 - Moderate' },
          { value: '6', label: '6' },
          { value: '7', label: '7' },
          { value: '8', label: '8' },
          { value: '9', label: '9' },
          { value: '10', label: '10 - Severe' },
        ],
      },
    ],
  },
  'Stroke-like Symptoms': {
    id: 'Stroke-like Symptoms',
    label: 'Stroke-like Symptoms',
    questions: [
      {
        id: 'difficultySpeaking',
        label: 'Are you having difficulty speaking or understanding speech?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'weaknessOnOneSide',
        label: 'Do you have weakness or numbness on one side of your body?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'facialDrooping',
        label: 'Is one side of your face drooping?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'visionProblems',
        label: 'Are you having vision problems or double vision?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'lossOfBalance',
        label: 'Are you having trouble with balance or coordination?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'suddenOnset',
        label: 'Did these symptoms start suddenly?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'severeHeadache',
        label: 'Do you have a severe headache?',
        type: 'yesno',
        required: false,
      },
    ],
  },
  'Trauma': {
    id: 'Trauma',
    label: 'Trauma / Injury',
    questions: [
      {
        id: 'mechanismOfInjury',
        label: 'How did the injury occur?',
        type: 'text',
        required: false,
      },
      {
        id: 'lossOfConsciousness',
        label: 'Did you lose consciousness?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'neckPain',
        label: 'Do you have neck pain?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'backPain',
        label: 'Do you have back pain?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'bleeding',
        label: 'Are you bleeding?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'difficultyMoving',
        label: 'Are you having difficulty moving any body part?',
        type: 'yesno',
        required: false,
      },
    ],
  },
  'Severe Headache': {
    id: 'Severe Headache',
    label: 'Severe Headache',
    questions: [
      {
        id: 'severeHeadache',
        label: 'Is this the worst headache of your life?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'suddenOnset',
        label: 'Did it start suddenly?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'neckStiffness',
        label: 'Do you have neck stiffness?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'photophobia',
        label: 'Are you sensitive to light?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'visionProblems',
        label: 'Are you having vision problems?',
        type: 'yesno',
        required: false,
      },
      {
        id: 'fever',
        label: 'Do you have a fever?',
        type: 'yesno',
        required: false,
      },
    ],
  },
  'Other': {
    id: 'Other',
    label: 'Other',
    questions: [
      {
        id: 'symptomDescription',
        label: 'Please describe your symptoms',
        type: 'text',
        required: false,
      },
      {
        id: 'whenDidItStart',
        label: 'When did this start?',
        type: 'text',
        required: false,
      },
      {
        id: 'whatMakesItWorse',
        label: 'What makes it worse?',
        type: 'text',
        required: false,
      },
      {
        id: 'whatMakesItBetter',
        label: 'What makes it better?',
        type: 'text',
        required: false,
      },
    ],
  },
}

/**
 * Get symptom questions for a given complaint category
 */
export function getSymptomQuestions(category: string): SymptomQuestion[] {
  return SYMPTOM_QUESTIONS[category]?.questions ?? SYMPTOM_QUESTIONS['Other'].questions
}

/**
 * Get all available complaint categories
 */
export function getComplaintCategories(): ComplaintCategory[] {
  return Object.values(SYMPTOM_QUESTIONS)
}

