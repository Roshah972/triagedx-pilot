/**
 * LLM summary input/output contracts and prompt builder
 * 
 * This module defines the interface for generating nurse-facing summaries
 * from triage results. The LLM is advisory only - it does NOT decide severity,
 * only explains and flags patterns.
 */

import type {
  TriagePatientContext,
  TriageResult,
  ChiefComplaintCategory,
} from './types';

/**
 * Input for LLM nurse summary generation
 */
export interface NurseSummaryInput {
  patient: TriagePatientContext;
  triageResult: TriageResult;
  complaintCategory: ChiefComplaintCategory;
  complaintSubtype?: string;
  answers: Record<string, unknown>;
}

/**
 * Output from LLM nurse summary generation
 */
export interface NurseSummaryOutput {
  summaryText: string;       // 2–4 sentences
  redFlagNotes?: string[];   // Bullet reasons for concern
  consistencyFlags?: string[]; // e.g. "Pattern suggests higher risk than patient-reported severity"
}

/**
 * Build a prompt string for LLM to generate nurse-facing summary
 * 
 * The prompt explicitly instructs the LLM to:
 * - Include age, ageBracket, and biologicalSex
 * - Not override the severity (already decided by rules)
 * - Explain the severity assignment
 * - Flag any consistency issues or patterns
 * 
 * @param input - Nurse summary input with patient context and triage result
 * @returns Prompt string for LLM
 */
export function buildNurseSummaryPrompt(input: NurseSummaryInput): string {
  const { patient, triageResult, complaintCategory, complaintSubtype, answers } = input;
  const { ageAtVisit, ageBracket, biologicalSex } = patient;
  const { severity, ruleHits, rationale } = triageResult;

  // Format age description
  const ageDesc = ageBracket === "INFANT"
    ? `${Math.round(ageAtVisit * 12)} months old`
    : ageBracket === "CHILD"
      ? `${Math.round(ageAtVisit)} years old (child)`
      : ageBracket === "ADOLESCENT"
        ? `${Math.round(ageAtVisit)} years old (adolescent)`
        : ageBracket === "GERIATRIC"
          ? `${Math.round(ageAtVisit)} years old (geriatric)`
          : `${Math.round(ageAtVisit)} years old (adult)`;

  const sexDesc = biologicalSex === "MALE" 
    ? "male" 
    : biologicalSex === "FEMALE" 
      ? "female" 
      : "unknown biological sex";

  // Format complaint description
  const complaintDesc = complaintSubtype
    ? `${complaintCategory.toLowerCase().replace(/_/g, " ")} (${complaintSubtype.toLowerCase().replace(/_/g, " ")})`
    : complaintCategory.toLowerCase().replace(/_/g, " ");

  // Format key answers for context
  const keyAnswers = Object.entries(answers)
    .filter(([_, value]) => value !== null && value !== undefined && value !== false && value !== "")
    .map(([key, value]) => {
      // Format boolean values
      if (value === true || value === "true") {
        return `- ${key.replace(/_/g, " ")}: Yes`;
      }
      // Format string/number values
      return `- ${key.replace(/_/g, " ")}: ${String(value)}`;
    })
    .join("\n");

  // Format rule hits
  const ruleHitDescriptions = ruleHits
    .sort((a, b) => b.weight - a.weight)
    .map(r => `  - ${r.description} (weight: ${r.weight})`)
    .join("\n");

  const prompt = `You are a clinical assistant helping to generate a concise nurse-facing summary for an ED triage case.

PATIENT CONTEXT:
- Age: ${ageDesc}
- Biological sex: ${sexDesc}
- Age bracket: ${ageBracket}

CHIEF COMPLAINT:
- Category: ${complaintCategory}
${complaintSubtype ? `- Subtype: ${complaintSubtype}` : ""}
- Description: ${complaintDesc}

SYMPTOM ANSWERS:
${keyAnswers || "No specific answers provided"}

TRIAGE RESULT:
- Severity: ${severity} (RED = immediate, ORANGE = urgent, YELLOW = standard, GREEN = routine)
- Rationale: ${rationale}
- Rule hits:
${ruleHitDescriptions || "  - No specific rules fired"}

INSTRUCTIONS:
1. Generate a concise 2-4 sentence summary for the triage nurse that includes:
   - Patient age, age bracket, and biological sex
   - Chief complaint description
   - Key symptom findings
   - The assigned severity level and why it was assigned

2. List any red flags or concerning patterns that warrant special attention (if any).

3. Flag any consistency issues if the symptom pattern suggests a different severity than assigned (e.g., "Patient reported low severity but symptom pattern suggests higher concern").

4. IMPORTANT: Do NOT override or change the severity level. The severity (${severity}) has already been determined by rule-based logic. Your role is to explain and contextualize, not to reassess.

5. Use clear, clinical language appropriate for ED triage nurses.

6. Be specific about age and sex considerations where relevant (e.g., "Geriatric patient with fall - elevated concern" or "Female of childbearing age with abdominal pain - pregnancy-related concerns considered").

Please format your response as JSON with the following structure:
{
  "summaryText": "2-4 sentence summary here",
  "redFlagNotes": ["flag 1", "flag 2", ...] or null,
  "consistencyFlags": ["flag 1", "flag 2", ...] or null
}`;

  return prompt;
}

/**
 * Parse LLM response into NurseSummaryOutput
 * 
 * This is a helper function to parse the JSON response from the LLM.
 * In production, this would handle error cases and validation.
 * 
 * @param llmResponse - Raw response string from LLM
 * @returns Parsed nurse summary output
 */
export function parseNurseSummaryResponse(llmResponse: string): NurseSummaryOutput {
  try {
    const parsed = JSON.parse(llmResponse);
    return {
      summaryText: parsed.summaryText || "",
      redFlagNotes: parsed.redFlagNotes || undefined,
      consistencyFlags: parsed.consistencyFlags || undefined,
    };
  } catch (error) {
    // Fallback if parsing fails
    return {
      summaryText: llmResponse,
      redFlagNotes: undefined,
      consistencyFlags: undefined,
    };
  }
}

