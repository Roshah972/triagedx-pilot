/**
 * Translation strings for P-Portal
 * Simple config-based approach for i18n
 */

export type Language = 'en' | 'es'

export interface Translations {
  // Page title
  pageTitle: string

  // Progress indicators
  stepDemographics: string
  stepComplaint: string
  stepSymptoms: string
  stepReview: string

  // Demographics section
  yourInformation: string
  firstName: string
  lastName: string
  dob: string
  sex: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zipCode: string
  required: string

  // Chief complaint section
  whatBringsYouIn: string
  mainConcern: string
  describeConcern: string

  // Symptoms section
  additionalQuestions: string
  answerQuestions: string
  medicalHistory: string
  selectAllThatApply: string

  // Review section
  reviewYourInformation: string
  personalInformation: string
  chiefComplaint: string
  symptoms: string
  description: string

  // Navigation
  back: string
  next: string
  submit: string
  submitting: string

  // Success
  intakeSubmitted: string
  waitToBeCalled: string

  // Common
  select: string
  other: string
  yes: string
  no: string
}

export const translations: Record<Language, Translations> = {
  en: {
    pageTitle: 'Emergency Department Check-In',
    stepDemographics: 'Your Information',
    stepComplaint: 'Chief Complaint',
    stepSymptoms: 'Symptoms',
    stepReview: 'Review',
    yourInformation: 'Your Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    dob: 'Date of Birth',
    sex: 'Sex',
    phone: 'Phone Number',
    email: 'Email',
    address: 'Address',
    city: 'City',
    state: 'State',
    zipCode: 'ZIP',
    required: '*',
    whatBringsYouIn: 'What brings you in today?',
    mainConcern: 'Main Concern',
    describeConcern: 'Please describe your concern',
    additionalQuestions: 'Additional Questions',
    answerQuestions: 'Please answer these questions to help us assess your condition.',
    medicalHistory: 'Medical History',
    selectAllThatApply: 'Do you have any of the following? (Select all that apply)',
    reviewYourInformation: 'Review Your Information',
    personalInformation: 'Personal Information',
    chiefComplaint: 'Chief Complaint',
    symptoms: 'Symptoms',
    description: 'Description',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    submitting: 'Submitting...',
    intakeSubmitted: '✓ Intake Submitted Successfully',
    waitToBeCalled: 'Please wait to be called. A staff member will assist you shortly.',
    select: 'Select...',
    other: 'Other',
    yes: 'Yes',
    no: 'No',
  },
  es: {
    pageTitle: 'Registro del Departamento de Emergencias',
    stepDemographics: 'Su Información',
    stepComplaint: 'Motivo de Consulta',
    stepSymptoms: 'Síntomas',
    stepReview: 'Revisar',
    yourInformation: 'Su Información',
    firstName: 'Nombre',
    lastName: 'Apellido',
    dob: 'Fecha de Nacimiento',
    sex: 'Sexo',
    phone: 'Número de Teléfono',
    email: 'Correo Electrónico',
    address: 'Dirección',
    city: 'Ciudad',
    state: 'Estado',
    zipCode: 'Código Postal',
    required: '*',
    whatBringsYouIn: '¿Qué le trae hoy?',
    mainConcern: 'Motivo Principal',
    describeConcern: 'Por favor describa su preocupación',
    additionalQuestions: 'Preguntas Adicionales',
    answerQuestions: 'Por favor responda estas preguntas para ayudarnos a evaluar su condición.',
    medicalHistory: 'Historial Médico',
    selectAllThatApply: '¿Tiene alguno de los siguientes? (Seleccione todos los que apliquen)',
    reviewYourInformation: 'Revise Su Información',
    personalInformation: 'Información Personal',
    chiefComplaint: 'Motivo de Consulta',
    symptoms: 'Síntomas',
    description: 'Descripción',
    back: 'Atrás',
    next: 'Siguiente',
    submit: 'Enviar',
    submitting: 'Enviando...',
    intakeSubmitted: '✓ Registro Enviado Exitosamente',
    waitToBeCalled: 'Por favor espere a ser llamado. Un miembro del personal lo asistirá pronto.',
    select: 'Seleccionar...',
    other: 'Otro',
    yes: 'Sí',
    no: 'No',
  },
}

/**
 * Get translations for a specific language
 */
export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en
}

/**
 * Get complaint category translations
 */
export const complaintCategories: Record<Language, Record<string, string>> = {
  en: {
    'Chest Pain': 'Chest Pain',
    'Shortness of Breath': 'Shortness of Breath',
    'Abdominal Pain': 'Abdominal Pain',
    'Stroke-like Symptoms': 'Stroke-like Symptoms',
    'Trauma': 'Trauma',
    'Severe Headache': 'Severe Headache',
    'Other': 'Other',
  },
  es: {
    'Chest Pain': 'Dolor de Pecho',
    'Shortness of Breath': 'Dificultad para Respirar',
    'Abdominal Pain': 'Dolor Abdominal',
    'Stroke-like Symptoms': 'Síntomas de Accidente Cerebrovascular',
    'Trauma': 'Trauma',
    'Severe Headache': 'Dolor de Cabeza Severo',
    'Other': 'Otro',
  },
}

/**
 * Get sex option translations
 */
export const sexOptions: Record<Language, Record<string, string>> = {
  en: {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other',
    UNKNOWN: 'Prefer not to say',
  },
  es: {
    MALE: 'Masculino',
    FEMALE: 'Femenino',
    OTHER: 'Otro',
    UNKNOWN: 'Prefiero no decir',
  },
}

/**
 * Get risk factor translations
 */
export const riskFactorLabels: Record<Language, Record<string, string>> = {
  en: {
    cardiacHistory: 'Heart disease or heart attack',
    strokeHistory: 'Previous stroke',
    diabetes: 'Diabetes',
    hypertension: 'High blood pressure',
    pregnancy: 'Pregnancy',
    anticoagulantUse: 'Taking blood thinners',
    cancerHistory: 'History of cancer',
  },
  es: {
    cardiacHistory: 'Enfermedad cardíaca o ataque al corazón',
    strokeHistory: 'Accidente cerebrovascular previo',
    diabetes: 'Diabetes',
    hypertension: 'Presión arterial alta',
    pregnancy: 'Embarazo',
    anticoagulantUse: 'Tomando anticoagulantes',
    cancerHistory: 'Historial de cáncer',
  },
}

