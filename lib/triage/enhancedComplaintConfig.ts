/**
 * Enhanced Complaint Configuration with Dependencies and Dynamic Logic
 * 
 * This extends the base complaint config with:
 * - Question dependencies
 * - Dynamic option generation
 * - Conditional branching logic
 * - Real-time question updates
 */

import type {
  ComplaintConfig,
  TriagePatientContext,
} from './types';
import type { EnhancedQuestionDefinition, QuestionDependency } from './questionEngine';
import {
  CHEST_PAIN_CONFIG,
  BREATHING_CONFIG,
  ABDOMINAL_PAIN_CONFIG,
  FEVER_CONFIG,
  NEURO_CONFIG,
  TRAUMA_CONFIG,
  PSYCH_CONFIG,
  OTHER_CONFIG,
} from './complaintConfig';

/**
 * Enhanced CHEST_PAIN configuration with dependencies
 * 
 * Clinical logic for ER triage:
 * 1. Always ask onset timing first (time-critical for ACS)
 * 2. Always ask radiation, SOB, and severity (critical red flags)
 * 3. Ask diaphoresis if ANY concerning feature present (not just radiation)
 * 4. Ask nausea if ANY concerning feature present (not just SOB)
 * 5. Ask exertion for recent onset (helps differentiate cardiac vs non-cardiac)
 * 6. Ask reproducible ONLY if severity is LOW (helps rule out musculoskeletal)
 */
export function getEnhancedChestPainConfig(): ComplaintConfig & { enhancedQuestions: EnhancedQuestionDefinition[] } {
  const baseConfig = CHEST_PAIN_CONFIG;
  
  const enhancedQuestions: EnhancedQuestionDefinition[] = [
    {
      ...baseConfig.questions[0], // onset_timing
      priority: 1,
      groupId: 'critical',
      required: true,
      skippable: false,
    },
    {
      ...baseConfig.questions[1], // radiation
      priority: 2,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - critical red flag
    },
    {
      ...baseConfig.questions[2], // shortness_of_breath
      priority: 3,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - critical red flag
    },
    {
      ...baseConfig.questions[6], // severity (moved up - need this early)
      priority: 4,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - critical for triage
    },
    {
      ...baseConfig.questions[3], // diaphoresis
      priority: 5,
      groupId: 'symptoms',
      required: false,
      skippable: true,
      dependencies: [
        {
          dependsOn: 'radiation',
          condition: (answer, allAnswers) => {
            // Show if radiation OR SOB OR severity >= 5
            return answer === true || 
                   allAnswers.shortness_of_breath === true ||
                   (typeof allAnswers.severity === 'string' && parseInt(allAnswers.severity) >= 5);
          },
        },
      ],
    },
    {
      ...baseConfig.questions[4], // nausea
      priority: 6,
      groupId: 'symptoms',
      required: false,
      skippable: true,
      dependencies: [
        {
          dependsOn: 'shortness_of_breath',
          condition: (answer, allAnswers) => {
            // Show if SOB OR radiation OR severity >= 5
            return answer === true || 
                   allAnswers.radiation === true ||
                   (typeof allAnswers.severity === 'string' && parseInt(allAnswers.severity) >= 5);
          },
        },
      ],
    },
    {
      ...baseConfig.questions[5], // exertion
      priority: 7,
      groupId: 'symptoms',
      required: false,
      skippable: true,
      dependencies: [
        {
          dependsOn: 'onset_timing',
          condition: (answer) => {
            // Show for recent onset (helps differentiate stable vs unstable angina)
            return answer === 'WITHIN_HOUR' || answer === 'JUST_NOW' || answer === 'FEW_HOURS';
          },
        },
      ],
    },
    {
      ...baseConfig.questions[7], // reproducible
      priority: 8,
      groupId: 'assessment',
      required: false,
      skippable: true,
      dependencies: [
        {
          dependsOn: 'severity',
          condition: (answer, allAnswers) => {
            // ONLY ask if severity is LOW (< 5) AND no red flags
            // This helps rule out musculoskeletal pain in low-risk patients
            const severity = typeof answer === 'string' ? parseInt(answer) : 0;
            const hasRedFlags = allAnswers.radiation === true || 
                               allAnswers.shortness_of_breath === true ||
                               allAnswers.diaphoresis === true;
            return severity < 5 && !hasRedFlags;
          },
        },
      ],
    },
  ];

  return {
    ...baseConfig,
    enhancedQuestions,
  };
}

/**
 * Enhanced FEVER configuration with dependencies
 * 
 * Clinical logic for ER triage:
 * 1. Always ask temperature (critical baseline)
 * 2. Always ask duration (helps differentiate acute vs chronic)
 * 3. Always ask lethargy (critical red flag for all ages)
 * 4. Ask hydration if lethargic OR high fever
 * 5. Ask wet diapers for infants/children (dehydration assessment)
 * 6. Always ask stiff neck (meningitis red flag)
 * 7. Always ask breathing difficulty (respiratory distress)
 * 8. Ask rash if fever present (meningococcemia concern)
 * 9. Ask confusion for adults/geriatric (sepsis concern)
 */
export function getEnhancedFeverConfig(): ComplaintConfig & { enhancedQuestions: EnhancedQuestionDefinition[] } {
  const baseConfig = FEVER_CONFIG;
  
  const enhancedQuestions: EnhancedQuestionDefinition[] = [
    {
      ...baseConfig.questions[0], // max_temperature
      priority: 1,
      groupId: 'critical',
      required: true,
      skippable: false,
    },
    {
      ...baseConfig.questions[1], // duration
      priority: 2,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - helps differentiate acute vs chronic
    },
    {
      ...baseConfig.questions[2], // lethargy
      priority: 3,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - critical red flag for sepsis/serious infection
    },
    {
      ...baseConfig.questions[6], // stiff_neck (moved up - critical red flag)
      priority: 4,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - meningitis red flag
    },
    {
      ...baseConfig.questions[7], // breathing_difficulty (moved up - critical)
      priority: 5,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - respiratory distress
    },
    {
      ...baseConfig.questions[3], // hydration
      priority: 6,
      groupId: 'symptoms',
      required: false,
      skippable: true,
      dependencies: [
        {
          dependsOn: 'lethargy',
          condition: (answer, allAnswers) => {
            // Show if lethargic OR high fever
            const temp = typeof allAnswers.max_temperature === 'number' 
              ? allAnswers.max_temperature 
              : typeof allAnswers.max_temperature === 'string' 
                ? parseFloat(allAnswers.max_temperature) 
                : 0;
            return answer === true || temp > 102;
          },
        },
      ],
    },
    {
      ...baseConfig.questions[4], // wet_diapers (pediatric only)
      priority: 7,
      groupId: 'pediatric',
      required: false,
      skippable: true,
      // showIf handles age/sex filtering already in base config
    },
    {
      ...baseConfig.questions[5], // rash
      priority: 8,
      groupId: 'symptoms',
      required: false,
      skippable: true,
      dependencies: [
        {
          dependsOn: 'max_temperature',
          condition: (answer) => {
            // Show if ANY fever present (meningococcemia can present with any fever)
            const temp = typeof answer === 'number' ? answer : typeof answer === 'string' ? parseFloat(answer) : 0;
            return temp > 100.4;
          },
        },
      ],
    },
    {
      ...baseConfig.questions[8], // confusion (adult/geriatric)
      priority: 9,
      groupId: 'red_flags',
      required: false,
      skippable: true,
      // showIf handles age filtering already in base config
    },
  ];

  return {
    ...baseConfig,
    enhancedQuestions,
  };
}

/**
 * Enhanced ABDOMINAL_PAIN configuration with dependencies
 * 
 * Clinical logic for ER triage:
 * 1. Always ask location (critical for differential diagnosis)
 * 2. Always ask onset type (sudden vs gradual changes differential)
 * 3. Always ask severity (critical for triage)
 * 4. Always ask vomiting (red flag for obstruction/serious pathology)
 * 5. Always ask blood in stool (GI bleed red flag)
 * 6. Ask diarrhea for all patients (helps differentiate gastroenteritis)
 * 7. Ask fever if RLQ or generalized (appendicitis concern)
 * 8. Ask pregnancy for females of childbearing age with lower abdominal pain
 * 9. Ask vaginal bleeding if pregnant (ectopic concern)
 */
export function getEnhancedAbdominalPainConfig(): ComplaintConfig & { enhancedQuestions: EnhancedQuestionDefinition[] } {
  const baseConfig = ABDOMINAL_PAIN_CONFIG;
  
  const enhancedQuestions: EnhancedQuestionDefinition[] = [
    {
      ...baseConfig.questions[0], // location
      priority: 1,
      groupId: 'critical',
      required: true,
      skippable: false,
    },
    {
      ...baseConfig.questions[1], // onset_type
      priority: 2,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - critical for differential
    },
    {
      ...baseConfig.questions[6], // severity (moved up)
      priority: 3,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - critical for triage
    },
    {
      ...baseConfig.questions[2], // vomiting
      priority: 4,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - red flag for obstruction
    },
    {
      ...baseConfig.questions[4], // blood_stool (moved up - critical red flag)
      priority: 5,
      groupId: 'critical',
      required: true,
      skippable: false,
      // Always show - GI bleed red flag
    },
    {
      ...baseConfig.questions[3], // diarrhea
      priority: 6,
      groupId: 'symptoms',
      required: false,
      skippable: true,
      // Always show - helps differentiate gastroenteritis
    },
    {
      ...baseConfig.questions[5], // fever
      priority: 7,
      groupId: 'symptoms',
      required: false,
      skippable: true,
      dependencies: [
        {
          dependsOn: 'location',
          condition: (answer) => {
            // Show for RLQ (appendicitis), RUQ (cholecystitis), or generalized
            return answer === 'RLQ' || answer === 'RUQ' || answer === 'GENERALIZED';
          },
        },
      ],
    },
    {
      ...baseConfig.questions[7], // pregnancy
      priority: 8,
      groupId: 'special',
      required: false,
      skippable: true,
      // showIf handles age/sex filtering already in base config
      dependencies: [
        {
          dependsOn: 'location',
          condition: (answer, allAnswers, context) => {
            // Only show for females of childbearing age with lower abdominal pain
            return context.biologicalSex === 'FEMALE' &&
                   (context.ageBracket === 'ADOLESCENT' || context.ageBracket === 'ADULT') &&
                   (answer === 'RLQ' || answer === 'LLQ' || answer === 'GENERALIZED');
          },
        },
      ],
    },
    {
      ...baseConfig.questions[8], // vaginal_bleeding
      priority: 9,
      groupId: 'special',
      required: false,
      skippable: true,
      dependencies: [
        {
          dependsOn: 'pregnancy',
          condition: (answer) => {
            // Only show if patient indicates pregnancy
            return answer === true;
          },
        },
      ],
    },
  ];

  return {
    ...baseConfig,
    enhancedQuestions,
  };
}

/**
 * Get enhanced config for a complaint category
 */
export function getEnhancedComplaintConfig(category: string): ComplaintConfig & { enhancedQuestions?: EnhancedQuestionDefinition[] } {
  switch (category) {
    case 'CHEST_PAIN':
      return getEnhancedChestPainConfig();
    case 'FEVER':
      return getEnhancedFeverConfig();
    case 'ABDOMINAL_PAIN':
      return getEnhancedAbdominalPainConfig();
    default:
      // Return base config for others (can be enhanced later)
      return {
        ...OTHER_CONFIG,
        enhancedQuestions: OTHER_CONFIG.questions.map((q, i) => ({
          ...q,
          priority: i + 1,
        })) as EnhancedQuestionDefinition[],
      };
  }
}

