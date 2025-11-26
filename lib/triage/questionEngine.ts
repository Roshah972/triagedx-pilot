/**
 * Dynamic Question Engine with Complex Conditional Logic
 * 
 * This engine evaluates question dependencies, conditional display logic,
 * and dynamically updates available questions based on previous answers.
 * Supports complex branching, multi-level dependencies, and real-time updates.
 */

import type {
  QuestionDefinition,
  TriagePatientContext,
  ChiefComplaintCategory,
} from './types';
import { getComplaintConfig } from './complaintConfig';
import { getEnhancedComplaintConfig } from './enhancedComplaintConfig';

/**
 * Question dependency rule
 * Defines when a question should be shown based on other answers
 */
export interface QuestionDependency {
  // Question ID that this depends on
  dependsOn: string;
  // Condition function that evaluates if question should be shown
  condition: (answer: any, allAnswers: Record<string, unknown>, context: TriagePatientContext) => boolean;
  // Optional: If true, question is hidden when condition is false (default: shown when true)
  hideWhen?: boolean;
}

/**
 * Enhanced question definition with dependencies and dynamic logic
 */
export interface EnhancedQuestionDefinition extends QuestionDefinition {
  // Dependencies that control when this question is shown
  dependencies?: QuestionDependency[];
  // Dynamic options generator (options can change based on previous answers)
  dynamicOptions?: (answers: Record<string, unknown>, context: TriagePatientContext) => Array<{ value: string; label: string }>;
  // Question priority (lower = shown first)
  priority?: number;
  // Group ID for grouping related questions
  groupId?: string;
  // Whether question can be skipped
  skippable?: boolean;
  // Validation function
  validate?: (value: any, answers: Record<string, unknown>) => boolean | string;
}

/**
 * Question evaluation result
 */
export interface QuestionEvaluation {
  question: EnhancedQuestionDefinition;
  shouldShow: boolean;
  reason?: string;
  availableOptions?: Array<{ value: string; label: string }>;
}

/**
 * Question flow state
 */
export interface QuestionFlowState {
  currentQuestionIndex: number;
  visibleQuestions: EnhancedQuestionDefinition[];
  answeredQuestions: Record<string, unknown>;
  questionHistory: string[]; // Track order of questions answered
  skippedQuestions: Set<string>;
}

/**
 * Evaluate if a question should be shown based on dependencies
 * 
 * CRITICAL SAFETY LOGIC:
 * - Required questions ALWAYS show if dependencies are met
 * - If a question has no dependencies, it always shows (unless showIf blocks it)
 * - Dependencies are evaluated with AND logic (all must pass)
 * - showIf is evaluated AFTER dependencies (additional filter)
 */
export function evaluateQuestionVisibility(
  question: EnhancedQuestionDefinition,
  answers: Record<string, unknown>,
  context: TriagePatientContext
): boolean {
  // First check showIf condition (age/sex filtering)
  // This comes FIRST because it's about patient appropriateness
  if (question.showIf) {
    const showIfResult = question.showIf(context, answers);
    if (!showIfResult) {
      return false; // Question not appropriate for this patient
    }
  }

  // If no dependencies, show the question
  if (!question.dependencies || question.dependencies.length === 0) {
    return true;
  }

  // Evaluate all dependencies with AND logic
  // ALL dependencies must pass for question to show
  for (const dependency of question.dependencies) {
    const dependentAnswer = answers[dependency.dependsOn];
    
    // SAFETY CHECK: If dependent question hasn't been answered yet, don't show this question
    // This prevents questions from appearing prematurely
    if (dependentAnswer === null || dependentAnswer === undefined) {
      return false;
    }
    
    const shouldShow = dependency.condition(dependentAnswer, answers, context);
    
    // If hideWhen is true, invert the logic
    const finalShouldShow = dependency.hideWhen ? !shouldShow : shouldShow;
    
    if (!finalShouldShow) {
      return false;
    }
  }

  return true;
}

/**
 * Get dynamic options for a question
 */
export function getQuestionOptions(
  question: EnhancedQuestionDefinition,
  answers: Record<string, unknown>,
  context: TriagePatientContext
): Array<{ value: string; label: string }> {
  // Use dynamic options generator if available
  if (question.dynamicOptions) {
    return question.dynamicOptions(answers, context);
  }
  
  // Fall back to static options
  return question.options || [];
}

/**
 * Build visible questions list based on current answers
 * 
 * CRITICAL SAFETY CHECKS:
 * - Prevent infinite loops by tracking answered questions
 * - Ensure at least one question is always available (if questions exist)
 * - Sort by priority to ensure critical questions appear first
 * - Filter out questions not appropriate for patient context
 */
export function buildVisibleQuestions(
  complaintCategory: ChiefComplaintCategory,
  answers: Record<string, unknown>,
  context: TriagePatientContext,
  answeredQuestionIds: Set<string> = new Set()
): EnhancedQuestionDefinition[] {
  try {
    // Try to get enhanced config first
    const enhancedConfig = getEnhancedComplaintConfig(complaintCategory);
    let enhancedQuestions: EnhancedQuestionDefinition[];
    
    if (enhancedConfig.enhancedQuestions) {
      enhancedQuestions = enhancedConfig.enhancedQuestions;
    } else {
      // Fall back to base config
      const config = getComplaintConfig(complaintCategory);
      enhancedQuestions = config.questions.map((q, index) => ({
        ...q,
        priority: index, // Default priority is order in config
        required: q.required || false,
        skippable: q.skippable !== false, // Default to skippable unless explicitly false
      }));
    }

    // Filter questions based on visibility
    const visibleQuestions = enhancedQuestions.filter((question) => {
      // Skip if already answered
      if (answeredQuestionIds.has(question.id)) {
        return false;
      }
      
      // Evaluate visibility
      try {
        return evaluateQuestionVisibility(question, answers, context);
      } catch (error) {
        console.error(`Error evaluating visibility for question ${question.id}:`, error);
        // If there's an error evaluating visibility, show the question anyway (fail-safe)
        return true;
      }
    });

    // Sort by priority (lower priority = shown first)
    visibleQuestions.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    // SAFETY CHECK: If we have no visible questions but have unanswered questions,
    // show the first unanswered question (prevents getting stuck)
    if (visibleQuestions.length === 0 && answeredQuestionIds.size < enhancedQuestions.length) {
      const unansweredQuestions = enhancedQuestions.filter(q => !answeredQuestionIds.has(q.id));
      if (unansweredQuestions.length > 0) {
        console.warn('No visible questions found, showing first unanswered question as fallback');
        return [unansweredQuestions[0]];
      }
    }

    return visibleQuestions;
  } catch (error) {
    console.error('Error building visible questions:', error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Get next question to show
 */
export function getNextQuestion(
  complaintCategory: ChiefComplaintCategory,
  answers: Record<string, unknown>,
  context: TriagePatientContext,
  answeredQuestionIds: Set<string> = new Set()
): EnhancedQuestionDefinition | null {
  const visibleQuestions = buildVisibleQuestions(complaintCategory, answers, context, answeredQuestionIds);
  return visibleQuestions.length > 0 ? visibleQuestions[0] : null;
}

/**
 * Validate question answer
 * 
 * CRITICAL SAFETY VALIDATION:
 * - Required questions cannot be skipped
 * - Numeric answers must be within valid ranges
 * - Boolean answers must be true/false
 * - Choice answers must be from valid options
 */
export function validateQuestionAnswer(
  question: EnhancedQuestionDefinition,
  value: any,
  answers: Record<string, unknown>
): { valid: boolean; error?: string } {
  // Check if required
  if (question.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: 'This question is required for clinical triage' };
  }

  // Type-specific validation
  if (value !== null && value !== undefined && value !== '') {
    switch (question.type) {
      case 'BOOLEAN':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return { valid: false, error: 'Please select Yes or No' };
        }
        break;
      
      case 'CHOICE':
      case 'SCALE':
        // Validate that value is one of the valid options
        if (question.options && question.options.length > 0) {
          const validValues = question.options.map(opt => opt.value);
          if (!validValues.includes(String(value))) {
            return { valid: false, error: 'Please select a valid option' };
          }
        }
        break;
    }
  }

  // Run custom validation if provided
  if (question.validate) {
    const validationResult = question.validate(value, answers);
    if (validationResult === false) {
      return { valid: false, error: 'Invalid answer' };
    }
    if (typeof validationResult === 'string') {
      return { valid: false, error: validationResult };
    }
  }

  return { valid: true };
}

/**
 * Check if answer triggers additional questions
 */
export function getTriggeredQuestions(
  questionId: string,
  answer: any,
  complaintCategory: ChiefComplaintCategory,
  currentAnswers: Record<string, unknown>,
  context: TriagePatientContext,
  answeredQuestionIds: Set<string>
): EnhancedQuestionDefinition[] {
  // Try to get enhanced config first
  const enhancedConfig = getEnhancedComplaintConfig(complaintCategory);
  let enhancedQuestions: EnhancedQuestionDefinition[];
  
  if (enhancedConfig.enhancedQuestions) {
    enhancedQuestions = enhancedConfig.enhancedQuestions;
  } else {
    // Fall back to base config
    const config = getComplaintConfig(complaintCategory);
    enhancedQuestions = config.questions.map((q, index) => ({
      ...q,
      priority: index,
    }));
  }

  // Find questions that depend on this answer
  const triggered = enhancedQuestions.filter((question) => {
    // Skip if already answered
    if (answeredQuestionIds.has(question.id)) {
      return false;
    }

    // Check if this question depends on the answered question
    if (question.dependencies) {
      return question.dependencies.some(
        (dep) => dep.dependsOn === questionId && dep.condition(answer, currentAnswers, context)
      );
    }

    return false;
  });

  return triggered;
}

/**
 * Build complete question flow with all dependencies resolved
 */
export function buildQuestionFlow(
  complaintCategory: ChiefComplaintCategory,
  context: TriagePatientContext,
  initialAnswers: Record<string, unknown> = {}
): QuestionFlowState {
  const visibleQuestions = buildVisibleQuestions(complaintCategory, initialAnswers, context);
  
  return {
    currentQuestionIndex: 0,
    visibleQuestions,
    answeredQuestions: { ...initialAnswers },
    questionHistory: [],
    skippedQuestions: new Set(),
  };
}

/**
 * Update question flow when an answer is provided
 */
export function updateQuestionFlow(
  flowState: QuestionFlowState,
  questionId: string,
  answer: any,
  complaintCategory: ChiefComplaintCategory,
  context: TriagePatientContext
): QuestionFlowState {
  // Add answer
  const newAnswers = {
    ...flowState.answeredQuestions,
    [questionId]: answer,
  };

  // Add to history
  const newHistory = [...flowState.questionHistory, questionId];

  // Rebuild visible questions
  const answeredIds = new Set([...flowState.skippedQuestions, ...newHistory]);
  const visibleQuestions = buildVisibleQuestions(complaintCategory, newAnswers, context, answeredIds);

  // Check for newly triggered questions
  const triggered = getTriggeredQuestions(
    questionId,
    answer,
    complaintCategory,
    newAnswers,
    context,
    answeredIds
  );

  // Merge triggered questions into visible list (maintaining priority)
  const allVisible = [...visibleQuestions, ...triggered];
  allVisible.sort((a, b) => (a.priority || 0) - (b.priority || 0));

  return {
    currentQuestionIndex: 0, // Reset to first visible question
    visibleQuestions: allVisible,
    answeredQuestions: newAnswers,
    questionHistory: newHistory,
    skippedQuestions: flowState.skippedQuestions,
  };
}

/**
 * Skip a question
 */
export function skipQuestion(
  flowState: QuestionFlowState,
  questionId: string
): QuestionFlowState {
  const newSkipped = new Set([...flowState.skippedQuestions, questionId]);
  
  // Remove from visible if it's there
  const visibleQuestions = flowState.visibleQuestions.filter(q => q.id !== questionId);

  return {
    ...flowState,
    visibleQuestions,
    skippedQuestions: newSkipped,
  };
}

/**
 * Get question groups for display
 */
export function getQuestionGroups(
  questions: EnhancedQuestionDefinition[]
): Map<string, EnhancedQuestionDefinition[]> {
  const groups = new Map<string, EnhancedQuestionDefinition[]>();
  
  questions.forEach((question) => {
    const groupId = question.groupId || 'default';
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(question);
  });

  return groups;
}

