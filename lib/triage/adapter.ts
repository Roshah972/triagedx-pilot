/**
 * Adapter functions to integrate new triage system with existing EWS infrastructure
 * 
 * This module provides conversion functions to map between the new triage severity
 * system and the existing EWS level system for backward compatibility.
 */

import { EwsLevel } from '@prisma/client';
import type { Severity, TriageResult } from './types';
import type { EwsResult } from '../ews/computeProvisionalEws';

/**
 * Convert triage severity to EWS level
 * 
 * Mapping:
 * - RED -> CRITICAL
 * - ORANGE -> HIGH
 * - YELLOW -> MODERATE
 * - GREEN -> LOW
 * 
 * @param severity - Triage severity level
 * @returns EWS level
 */
export function severityToEwsLevel(severity: Severity): EwsLevel {
  switch (severity) {
    case "RED":
      return EwsLevel.CRITICAL;
    case "ORANGE":
      return EwsLevel.HIGH;
    case "YELLOW":
      return EwsLevel.MODERATE;
    case "GREEN":
      return EwsLevel.LOW;
    default:
      return EwsLevel.LOW;
  }
}

/**
 * Convert triage result to EWS result format
 * 
 * This allows the new triage system to be used with existing EWS infrastructure
 * while maintaining backward compatibility.
 * 
 * @param triageResult - Triage evaluation result
 * @returns EWS result with level and flags
 */
export function triageResultToEwsResult(triageResult: TriageResult): EwsResult {
  // Map severity to EWS level
  const level = severityToEwsLevel(triageResult.severity);

  // Convert rule hits to flags
  // Use high-weight rule hits (weight >= 3) as flags
  const flags = triageResult.ruleHits
    .filter(rule => rule.weight >= 3)
    .map(rule => rule.id);

  // Calculate a numeric score based on severity
  // This is optional but helps with sorting/filtering
  const score = triageResult.severity === "RED" ? 8
    : triageResult.severity === "ORANGE" ? 5
    : triageResult.severity === "YELLOW" ? 3
    : 1;

  return {
    score,
    level,
    flags,
  };
}

/**
 * Convert Prisma Sex enum to BiologicalSex type
 * 
 * @param sex - Prisma Sex enum value
 * @returns BiologicalSex type
 */
export function prismaSexToBiologicalSex(sex: string): "MALE" | "FEMALE" | "UNKNOWN" {
  if (sex === "MALE") {
    return "MALE";
  } else if (sex === "FEMALE") {
    return "FEMALE";
  } else {
    return "UNKNOWN";
  }
}

