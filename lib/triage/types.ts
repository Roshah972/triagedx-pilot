/**
 * Core types for age-aware, sex-aware chief complaint triage system
 * 
 * This module defines the foundational types for the TriageDX triage engine,
 * which evaluates patient chief complaints with explicit awareness of age
 * and biological sex to assign appropriate severity levels.
 */

/**
 * Biological sex (not gender identity)
 * Used only where clinically relevant for triage decisions
 */
export type BiologicalSex = "MALE" | "FEMALE" | "UNKNOWN";

/**
 * Age brackets for triage evaluation
 * Age thresholds affect clinical decision-making (e.g., fever thresholds, 
 * chest pain evaluation, fall risk)
 */
export type AgeBracket =
  | "INFANT"       // 0–1 years
  | "CHILD"        // 2–11 years
  | "ADOLESCENT"   // 12–17 years
  | "ADULT"        // 18–64 years
  | "GERIATRIC";   // 65+ years

/**
 * Patient context required for triage evaluation
 * Age and biological sex are always considered in triage decisions
 */
export interface TriagePatientContext {
  ageAtVisit: number;        // in years, can be fractional for infants
  ageBracket: AgeBracket;
  biologicalSex: BiologicalSex;
}

/**
 * Chief complaint categories
 * These map to the complaint tiles shown to patients during intake
 */
export type ChiefComplaintCategory =
  | "CHEST_PAIN"
  | "BREATHING"
  | "ABDOMINAL_PAIN"
  | "FEVER"
  | "NEURO"
  | "TRAUMA"
  | "PSYCH"
  | "OTHER";

/**
 * Question type definitions
 * Questions can be conditionally shown based on age/sex context
 * 
 * BOOLEAN: Yes/No questions (chips)
 * CHOICE: Multiple choice with 2+ options (chips)
 * SCALE: Numeric scale (1-10) displayed as chips
 */
export interface QuestionDefinition {
  id: string;
  label: string;
  type: "BOOLEAN" | "CHOICE" | "SCALE";
  // For CHOICE/SCALE questions
  options?: { value: string; label: string }[];
  // Optional age/sex gating: only show if conditions met
  showIf?: (ctx: TriagePatientContext, answers: Record<string, unknown>) => boolean;
  // Optional: Mark as required (cannot be skipped)
  required?: boolean;
  // Optional: Mark as skippable (can be skipped)
  skippable?: boolean;
}

/**
 * Complaint configuration with subtypes and questions
 * Each complaint category can have subtypes (e.g., "CRUSHING_PRESSURE" for chest pain)
 * and a set of questions that may be conditionally displayed
 */
export interface ComplaintConfig {
  id: ChiefComplaintCategory;
  displayLabel: string;
  subtypes?: { id: string; label: string }[];
  questions: QuestionDefinition[];
}

/**
 * Triage severity levels
 * RED: Immediate attention (life-threatening)
 * ORANGE: Urgent attention (high risk)
 * YELLOW: Standard priority (moderate risk)
 * GREEN: Routine priority (low risk)
 */
export type Severity = "RED" | "ORANGE" | "YELLOW" | "GREEN";

/**
 * Input to triage evaluation
 * Contains patient context, complaint category/subtype, and symptom answers
 */
export interface TriageInput {
  patient: TriagePatientContext;
  complaintCategory: ChiefComplaintCategory;
  complaintSubtype?: string; // e.g. "CRUSHING_PRESSURE", "SHARP_RLQ"
  answers: Record<string, unknown>;
}

/**
 * Rule hit tracking
 * Records which rules fired during evaluation for transparency
 */
export interface TriageRuleHit {
  id: string;
  description: string;
  weight: number;  // Severity weight (higher = more severe)
}

/**
 * Triage evaluation result
 * Contains severity level, rule hits, and human-readable rationale
 */
export interface TriageResult {
  severity: Severity;
  ruleHits: TriageRuleHit[];
  rationale: string;  // Human-readable explanation of the severity assignment
}

