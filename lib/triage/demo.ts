/**
 * Demo usage examples for the triage system
 * 
 * This file demonstrates how to use the triage engine and LLM summary helpers.
 * These examples show how the system will be wired into Next.js route handlers
 * or server actions.
 */

import { evaluateTriage } from './triageEngine';
import { buildNurseSummaryPrompt, parseNurseSummaryResponse } from './llm';
import type { TriageInput, TriagePatientContext } from './types';
import { calculateAgeBracket } from '../utils/age';

/**
 * Example 1: 63-year-old male with chest pain
 * 
 * This demonstrates a classic ACS presentation in an older adult male.
 */
export function exampleChestPainOlderMale(): void {
  const patient: TriagePatientContext = {
    ageAtVisit: 63,
    ageBracket: calculateAgeBracket(63),
    biologicalSex: "MALE",
  };

  const input: TriageInput = {
    patient,
    complaintCategory: "CHEST_PAIN",
    complaintSubtype: "CRUSHING_PRESSURE",
    answers: {
      onset_timing: "WITHIN_HOUR",
      radiation: true,
      shortness_of_breath: true,
      diaphoresis: true,
      nausea: false,
      exertion: true,
      severity: "8",
    },
  };

  const result = evaluateTriage(input);
  
  console.log("=== Example 1: 63-year-old male with chest pain ===");
  console.log("Triage Result:", JSON.stringify(result, null, 2));
  
  // Build LLM prompt
  const prompt = buildNurseSummaryPrompt({
    patient,
    triageResult: result,
    complaintCategory: "CHEST_PAIN",
    complaintSubtype: "CRUSHING_PRESSURE",
    answers: input.answers,
  });
  
  console.log("\nLLM Prompt:");
  console.log(prompt);
  console.log("\n");
}

/**
 * Example 2: 3-year-old female with high fever
 * 
 * This demonstrates pediatric fever evaluation with age-specific thresholds.
 */
export function exampleFeverPediatric(): void {
  const patient: TriagePatientContext = {
    ageAtVisit: 3,
    ageBracket: calculateAgeBracket(3),
    biologicalSex: "FEMALE",
  };

  const input: TriageInput = {
    patient,
    complaintCategory: "FEVER",
    answers: {
      max_temperature: 103.5,
      duration: "DAYS",
      lethargy: true,
      hydration: false,
      wet_diapers: false,
      rash: false,
      stiff_neck: false,
      breathing_difficulty: false,
    },
  };

  const result = evaluateTriage(input);
  
  console.log("=== Example 2: 3-year-old female with high fever ===");
  console.log("Triage Result:", JSON.stringify(result, null, 2));
  
  const prompt = buildNurseSummaryPrompt({
    patient,
    triageResult: result,
    complaintCategory: "FEVER",
    answers: input.answers,
  });
  
  console.log("\nLLM Prompt:");
  console.log(prompt);
  console.log("\n");
}

/**
 * Example 3: 28-year-old female with RLQ pain and suspected pregnancy
 * 
 * This demonstrates sex-aware and age-aware evaluation for abdominal pain
 * with pregnancy considerations.
 */
export function exampleAbdominalPainPregnancy(): void {
  const patient: TriagePatientContext = {
    ageAtVisit: 28,
    ageBracket: calculateAgeBracket(28),
    biologicalSex: "FEMALE",
  };

  const input: TriageInput = {
    patient,
    complaintCategory: "ABDOMINAL_PAIN",
    complaintSubtype: "RLQ",
    answers: {
      location: "RLQ",
      onset_type: "SUDDEN",
      vomiting: true,
      diarrhea: false,
      blood_stool: false,
      fever: false,
      severity: "9",
      pregnancy: true,
      vaginal_bleeding: false,
    },
  };

  const result = evaluateTriage(input);
  
  console.log("=== Example 3: 28-year-old female with RLQ pain and suspected pregnancy ===");
  console.log("Triage Result:", JSON.stringify(result, null, 2));
  
  const prompt = buildNurseSummaryPrompt({
    patient,
    triageResult: result,
    complaintCategory: "ABDOMINAL_PAIN",
    complaintSubtype: "RLQ",
    answers: input.answers,
  });
  
  console.log("\nLLM Prompt:");
  console.log(prompt);
  console.log("\n");
}

/**
 * Example 4: 75-year-old geriatric patient with fall
 * 
 * This demonstrates age-aware trauma evaluation for geriatric patients.
 */
export function exampleTraumaGeriatric(): void {
  const patient: TriagePatientContext = {
    ageAtVisit: 75,
    ageBracket: calculateAgeBracket(75),
    biologicalSex: "MALE",
  };

  const input: TriageInput = {
    patient,
    complaintCategory: "TRAUMA",
    complaintSubtype: "FALL",
    answers: {
      mechanism: "FALL",
      loss_of_consciousness: false,
      neck_pain: false,
      back_pain: true,
      bleeding: false,
      difficulty_moving: false,
      fall_height: "GROUND",
    },
  };

  const result = evaluateTriage(input);
  
  console.log("=== Example 4: 75-year-old geriatric patient with fall ===");
  console.log("Triage Result:", JSON.stringify(result, null, 2));
  
  const prompt = buildNurseSummaryPrompt({
    patient,
    triageResult: result,
    complaintCategory: "TRAUMA",
    complaintSubtype: "FALL",
    answers: input.answers,
  });
  
  console.log("\nLLM Prompt:");
  console.log(prompt);
  console.log("\n");
}

/**
 * Example 5: 19-year-old male with reproducible chest wall pain
 * 
 * This demonstrates lower-severity assignment for young adults with
 * reproducible chest wall pain (likely musculoskeletal).
 */
export function exampleChestPainYoungAdult(): void {
  const patient: TriagePatientContext = {
    ageAtVisit: 19,
    ageBracket: calculateAgeBracket(19),
    biologicalSex: "MALE",
  };

  const input: TriageInput = {
    patient,
    complaintCategory: "CHEST_PAIN",
    answers: {
      onset_timing: "DAYS",
      radiation: false,
      shortness_of_breath: false,
      diaphoresis: false,
      nausea: false,
      exertion: false,
      severity: "4",
      reproducible: true,
    },
  };

  const result = evaluateTriage(input);
  
  console.log("=== Example 5: 19-year-old male with reproducible chest wall pain ===");
  console.log("Triage Result:", JSON.stringify(result, null, 2));
  
  const prompt = buildNurseSummaryPrompt({
    patient,
    triageResult: result,
    complaintCategory: "CHEST_PAIN",
    answers: input.answers,
  });
  
  console.log("\nLLM Prompt:");
  console.log(prompt);
  console.log("\n");
}

/**
 * Run all demo examples
 * 
 * This function can be called from a Next.js API route or server action
 * to demonstrate the triage system functionality.
 * 
 * Usage in Next.js:
 * ```ts
 * // app/api/triage/demo/route.ts
 * import { runDemoExamples } from '@/lib/triage/demo';
 * 
 * export async function GET() {
 *   runDemoExamples();
 *   return Response.json({ message: "Demo examples logged to console" });
 * }
 * ```
 */
export function runDemoExamples(): void {
  console.log("Running TriageDX Demo Examples\n");
  console.log("=".repeat(60));
  
  exampleChestPainOlderMale();
  exampleFeverPediatric();
  exampleAbdominalPainPregnancy();
  exampleTraumaGeriatric();
  exampleChestPainYoungAdult();
  
  console.log("=".repeat(60));
  console.log("Demo examples complete.");
}

