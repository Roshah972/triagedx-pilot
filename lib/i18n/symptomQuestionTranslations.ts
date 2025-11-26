import type { Language } from './translations'

/**
 * Translations for symptom questions
 * Maps question IDs to translations
 */
export const symptomQuestionTranslations: Record<
  Language,
  Record<string, string>
> = {
  en: {
    radiatingPain: 'Does the pain radiate to your arm, neck, or jaw?',
    chestPainWithExertion: 'Does the pain worsen with physical activity?',
    chestPainWithNausea: 'Are you experiencing nausea or vomiting?',
    chestPainWithSweating: 'Are you sweating or having cold sweats?',
    suddenOnset: 'Did the pain start suddenly?',
    shortnessOfBreath: 'Are you short of breath?',
    painSeverity: 'How severe is the pain? (1-10)',
    severeShortnessOfBreath: 'Are you having severe difficulty breathing?',
    difficultyBreathing: 'Is it hard to speak in full sentences?',
    chestPain: 'Do you have chest pain?',
    fever: 'Do you have a fever?',
    cough: 'Do you have a cough?',
    wheezing: 'Are you wheezing?',
    painLocation: 'Where is the pain located?',
    nausea: 'Are you experiencing nausea or vomiting?',
    bloodInStool: 'Is there blood in your stool or vomit?',
    difficultySpeaking: 'Are you having difficulty speaking or understanding speech?',
    weaknessOnOneSide: 'Do you have weakness or numbness on one side of your body?',
    facialDrooping: 'Is one side of your face drooping?',
    visionProblems: 'Are you having vision problems or double vision?',
    lossOfBalance: 'Are you having trouble with balance or coordination?',
    severeHeadache: 'Is this the worst headache of your life?',
    neckStiffness: 'Do you have neck stiffness?',
    photophobia: 'Are you sensitive to light?',
    confusion: 'Are you confused?',
    mechanismOfInjury: 'How did the injury occur?',
    lossOfConsciousness: 'Did you lose consciousness?',
    neckPain: 'Do you have neck pain?',
    backPain: 'Do you have back pain?',
    bleeding: 'Are you bleeding?',
    difficultyMoving: 'Are you having difficulty moving any body part?',
    symptomDescription: 'Please describe your symptoms',
    whenDidItStart: 'When did this start?',
    whatMakesItWorse: 'What makes it worse?',
    whatMakesItBetter: 'What makes it better?',
  },
  es: {
    radiatingPain: '¿El dolor se irradia a su brazo, cuello o mandíbula?',
    chestPainWithExertion: '¿El dolor empeora con la actividad física?',
    chestPainWithNausea: '¿Está experimentando náuseas o vómitos?',
    chestPainWithSweating: '¿Está sudando o tiene sudores fríos?',
    suddenOnset: '¿El dolor comenzó repentinamente?',
    shortnessOfBreath: '¿Tiene dificultad para respirar?',
    painSeverity: '¿Qué tan severo es el dolor? (1-10)',
    severeShortnessOfBreath: '¿Tiene dificultad severa para respirar?',
    difficultyBreathing: '¿Es difícil hablar en oraciones completas?',
    chestPain: '¿Tiene dolor en el pecho?',
    fever: '¿Tiene fiebre?',
    cough: '¿Tiene tos?',
    wheezing: '¿Tiene sibilancias?',
    painLocation: '¿Dónde está localizado el dolor?',
    nausea: '¿Está experimentando náuseas o vómitos?',
    bloodInStool: '¿Hay sangre en sus heces o vómito?',
    difficultySpeaking: '¿Tiene dificultad para hablar o entender el habla?',
    weaknessOnOneSide: '¿Tiene debilidad o entumecimiento en un lado de su cuerpo?',
    facialDrooping: '¿Un lado de su cara está caído?',
    visionProblems: '¿Tiene problemas de visión o visión doble?',
    lossOfBalance: '¿Tiene problemas con el equilibrio o la coordinación?',
    severeHeadache: '¿Es este el peor dolor de cabeza de su vida?',
    neckStiffness: '¿Tiene rigidez en el cuello?',
    photophobia: '¿Es sensible a la luz?',
    confusion: '¿Está confundido?',
    mechanismOfInjury: '¿Cómo ocurrió la lesión?',
    lossOfConsciousness: '¿Perdió el conocimiento?',
    neckPain: '¿Tiene dolor en el cuello?',
    backPain: '¿Tiene dolor de espalda?',
    bleeding: '¿Está sangrando?',
    difficultyMoving: '¿Tiene dificultad para mover alguna parte del cuerpo?',
    symptomDescription: 'Por favor describa sus síntomas',
    whenDidItStart: '¿Cuándo comenzó esto?',
    whatMakesItWorse: '¿Qué lo empeora?',
    whatMakesItBetter: '¿Qué lo mejora?',
  },
}

/**
 * Get translated symptom question label
 */
export function getTranslatedQuestionLabel(
  questionId: string,
  lang: Language
): string {
  return (
    symptomQuestionTranslations[lang]?.[questionId] ||
    symptomQuestionTranslations.en[questionId] ||
    questionId
  )
}

