/**
 * Utility functions for age calculations
 */

import type { AgeBracket } from '../triage/types';

/**
 * Calculate age from date of birth
 * 
 * @param dob - Date of birth
 * @returns Age in years
 */
export function calculateAge(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

/**
 * Estimate date of birth from approximate age
 * 
 * @param approximateAge - Approximate age in years
 * @returns Estimated date of birth
 */
export function estimateDobFromAge(approximateAge: number): Date {
  const today = new Date()
  return new Date(today.getFullYear() - approximateAge, today.getMonth(), today.getDate())
}

/**
 * Calculate age bracket from age in years
 * 
 * Age brackets:
 * - INFANT: 0-1 years
 * - CHILD: 2-11 years
 * - ADOLESCENT: 12-17 years
 * - ADULT: 18-64 years
 * - GERIATRIC: 65+ years
 * 
 * @param ageInYears - Age in years (can be fractional for infants)
 * @returns Age bracket
 */
export function calculateAgeBracket(ageInYears: number): AgeBracket {
  if (ageInYears < 2) {
    return "INFANT"
  } else if (ageInYears < 12) {
    return "CHILD"
  } else if (ageInYears < 18) {
    return "ADOLESCENT"
  } else if (ageInYears < 65) {
    return "ADULT"
  } else {
    return "GERIATRIC"
  }
}

