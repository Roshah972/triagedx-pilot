/**
 * Mapping functions to convert between old complaint category strings
 * and new ChiefComplaintCategory enum values
 * 
 * This provides backward compatibility with existing data and UI
 */

import type { ChiefComplaintCategory } from './types';

/**
 * Map old complaint category string to new ChiefComplaintCategory enum
 * 
 * Handles various string formats used in the existing system:
 * - "Chest Pain" -> "CHEST_PAIN"
 * - "Shortness of Breath" -> "BREATHING"
 * - "Abdominal Pain" -> "ABDOMINAL_PAIN"
 * - "Stroke-like Symptoms" -> "NEURO"
 * - etc.
 * 
 * @param oldCategory - Old complaint category string
 * @returns New ChiefComplaintCategory enum value, or "OTHER" if not recognized
 */
export function mapOldComplaintCategory(oldCategory: string | null | undefined): ChiefComplaintCategory {
  if (!oldCategory) {
    return "OTHER";
  }

  const normalized = oldCategory.trim().toLowerCase();

  // Map old categories to new enum values
  if (normalized.includes("chest") && normalized.includes("pain")) {
    return "CHEST_PAIN";
  }
  
  if (normalized.includes("breathing") || 
      normalized.includes("shortness") || 
      normalized.includes("respiratory")) {
    return "BREATHING";
  }
  
  if (normalized.includes("abdominal") || normalized.includes("stomach")) {
    return "ABDOMINAL_PAIN";
  }
  
  if (normalized.includes("fever") || normalized.includes("temperature")) {
    return "FEVER";
  }
  
  if (normalized.includes("stroke") || 
      normalized.includes("seizure") || 
      normalized.includes("neurological") ||
      normalized.includes("headache") ||
      normalized.includes("confusion") ||
      normalized.includes("altered mental")) {
    return "NEURO";
  }
  
  if (normalized.includes("trauma") || normalized.includes("injury")) {
    return "TRAUMA";
  }
  
  if (normalized.includes("psych") || 
      normalized.includes("behavioral") ||
      normalized.includes("suicidal")) {
    return "PSYCH";
  }

  // Default to OTHER for unrecognized categories
  return "OTHER";
}

/**
 * Map new ChiefComplaintCategory enum to old complaint category string
 * 
 * Useful for backward compatibility when displaying in UI that expects old format
 * 
 * @param newCategory - New ChiefComplaintCategory enum value
 * @returns Old complaint category string
 */
export function mapNewComplaintCategory(newCategory: ChiefComplaintCategory): string {
  const mapping: Record<ChiefComplaintCategory, string> = {
    CHEST_PAIN: "Chest Pain",
    BREATHING: "Shortness of Breath",
    ABDOMINAL_PAIN: "Abdominal Pain",
    FEVER: "Fever",
    NEURO: "Neurological Symptoms",
    TRAUMA: "Trauma",
    PSYCH: "Psychiatric or Behavioral",
    OTHER: "Other",
  };

  return mapping[newCategory] || "Other";
}

