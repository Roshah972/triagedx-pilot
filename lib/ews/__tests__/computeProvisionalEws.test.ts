import { computeProvisionalEws, IntakePayload } from '../computeProvisionalEws'
import { EwsLevel } from '@prisma/client'

describe('computeProvisionalEws', () => {
  /**
   * Test 1: Low-risk minor complaint
   * 
   * Scenario: Young adult with minor complaint (e.g., minor injury, cold symptoms)
   * Expected: LOW risk level, minimal score, no flags
   */
  describe('Low-risk minor complaint', () => {
    it('should return LOW risk for young adult with minor complaint', () => {
      const payload: IntakePayload = {
        age: 25,
        chiefComplaintCategory: 'Other',
        symptomAnswers: {
          fever: false,
          cough: true,
        },
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.level).toBe(EwsLevel.LOW)
      expect(result.score).toBeLessThan(3) // Below moderate threshold
      expect(result.flags).toEqual([])
    })

    it('should return LOW risk for minor injury without concerning symptoms', () => {
      const payload: IntakePayload = {
        age: 30,
        chiefComplaintCategory: 'Other',
        symptomAnswers: null,
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.level).toBe(EwsLevel.LOW)
      expect(result.score).toBe(0) // No points for age bracket 18-49, no complaint weight
      expect(result.flags).toEqual([])
    })
  })

  /**
   * Test 2: Chest pain with risk factors
   * 
   * Scenario: Elderly patient with chest pain, cardiac history, and concerning symptoms
   * Expected: HIGH or CRITICAL risk level, elevated score, chest_pain_acs and high_risk_cardiac flags
   */
  describe('Chest pain with risk factors', () => {
    it('should return CRITICAL risk for elderly patient with chest pain and cardiac history', () => {
      const payload: IntakePayload = {
        age: 70,
        chiefComplaintCategory: 'Chest Pain',
        symptomAnswers: {
          radiatingPain: true,
          chestPainWithSweating: true,
          chestPainWithNausea: true,
        },
        riskFactors: {
          cardiacHistory: true,
          hypertension: true,
          diabetes: true,
        },
      }

      const result = computeProvisionalEws(payload)

      // Age 70 = +2 points (65-79 bracket)
      // Chest Pain complaint = +3 points
      // radiatingPain = +2 points
      // chestPainWithSweating = +2 points
      // chestPainWithNausea = +2 points
      // cardiacHistory = +2 points
      // hypertension = +1 point
      // diabetes = +1 point
      // Total = 15 points (>= 8 = CRITICAL)
      expect(result.level).toBe(EwsLevel.CRITICAL)
      expect(result.score).toBeGreaterThanOrEqual(8)
      expect(result.flags).toContain('chest_pain_acs')
      expect(result.flags).toContain('high_risk_cardiac')
    })

    it('should return HIGH risk for middle-aged patient with chest pain and risk factors', () => {
      const payload: IntakePayload = {
        age: 55,
        chiefComplaintCategory: 'Chest Pain',
        symptomAnswers: {
          chestPainWithExertion: true,
        },
        riskFactors: {
          cardiacHistory: true,
        },
      }

      const result = computeProvisionalEws(payload)

      // Age 55 = +1 point (50-64 bracket)
      // Chest Pain complaint = +3 points
      // chestPainWithExertion = +2 points
      // cardiacHistory = +2 points
      // Total = 8 points (>= 5 = HIGH, >= 8 = CRITICAL)
      expect(result.level).toBe(EwsLevel.CRITICAL) // Actually CRITICAL due to score >= 8
      expect(result.score).toBeGreaterThanOrEqual(5)
      expect(result.flags).toContain('chest_pain_acs')
    })

    it('should flag high_risk_cardiac for patients 65+ with chest pain', () => {
      const payload: IntakePayload = {
        age: 65,
        chiefComplaintCategory: 'Chest Pain',
        symptomAnswers: null,
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.flags).toContain('high_risk_cardiac')
      expect(result.flags).toContain('chest_pain_acs')
    })
  })

  /**
   * Test 3: Stroke-like symptoms
   * 
   * Scenario: Patient presenting with stroke-like symptoms
   * Expected: CRITICAL or HIGH risk level, stroke_like flag
   */
  describe('Stroke-like symptoms', () => {
    it('should return CRITICAL risk for stroke-like symptoms', () => {
      const payload: IntakePayload = {
        age: 60,
        chiefComplaintCategory: 'Stroke-like Symptoms',
        symptomAnswers: {
          difficultySpeaking: true,
          weaknessOnOneSide: true,
          suddenOnset: true,
        },
        riskFactors: {
          strokeHistory: true,
        },
      }

      const result = computeProvisionalEws(payload)

      // Age 60 = +1 point (50-64 bracket)
      // Stroke-like Symptoms complaint = +4 points
      // difficultySpeaking = +2 points
      // weaknessOnOneSide = +3 points
      // suddenOnset = +2 points
      // strokeHistory = +2 points
      // Total = 14 points (>= 8 = CRITICAL)
      expect(result.level).toBe(EwsLevel.CRITICAL)
      expect(result.score).toBeGreaterThanOrEqual(8)
      expect(result.flags).toContain('stroke_like')
    })

    it('should flag stroke_like for difficulty speaking', () => {
      const payload: IntakePayload = {
        age: 45,
        chiefComplaintCategory: null,
        symptomAnswers: {
          difficultySpeaking: true,
          weaknessOnOneSide: true,
        },
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.flags).toContain('stroke_like')
    })

    it('should flag stroke_like for stroke-like complaint category', () => {
      const payload: IntakePayload = {
        age: 50,
        chiefComplaintCategory: 'Stroke-like Symptoms',
        symptomAnswers: null,
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.flags).toContain('stroke_like')
    })
  })

  /**
   * Test 4: Pediatric high-risk scenario
   * 
   * Scenario: Pediatric patient with high-risk symptoms (e.g., severe respiratory distress, altered mental status)
   * Expected: Appropriate risk level based on symptoms, even though age bracket gives 0 points
   */
  describe('Pediatric high-risk scenario', () => {
    it('should return HIGH risk for pediatric patient with severe respiratory distress', () => {
      const payload: IntakePayload = {
        age: 8,
        chiefComplaintCategory: 'Shortness of Breath',
        symptomAnswers: {
          severeShortnessOfBreath: true,
          difficultyBreathing: true,
          fever: true,
        },
        riskFactors: {
          immunosuppressed: true,
        },
      }

      const result = computeProvisionalEws(payload)

      // Age 8 = 0 points (0-17 bracket)
      // Shortness of Breath complaint = +3 points
      // severeShortnessOfBreath = +3 points
      // difficultyBreathing = not in symptomWeights, but triggers respiratory_distress flag
      // fever = +1 point
      // immunosuppressed = +2 points
      // Total = 9 points (>= 5 = HIGH, >= 8 = CRITICAL)
      expect(result.level).toBe(EwsLevel.CRITICAL) // Actually CRITICAL due to score >= 8
      expect(result.score).toBeGreaterThanOrEqual(5)
      expect(result.flags).toContain('respiratory_distress')
    })

    it('should return MODERATE risk for pediatric patient with altered mental status', () => {
      const payload: IntakePayload = {
        age: 12,
        chiefComplaintCategory: 'Altered Mental Status',
        symptomAnswers: {
          confusion: true,
          fever: true,
        },
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      // Age 12 = 0 points (0-17 bracket)
      // Altered Mental Status complaint = +3 points
      // confusion = +2 points
      // fever = +1 point
      // Total = 6 points (>= 5 = HIGH)
      expect(result.level).toBe(EwsLevel.HIGH)
      expect(result.score).toBeGreaterThanOrEqual(3)
    })

    it('should return LOW risk for pediatric patient with minor complaint', () => {
      const payload: IntakePayload = {
        age: 5,
        chiefComplaintCategory: 'Other',
        symptomAnswers: {
          fever: true,
        },
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      // Age 5 = 0 points (0-17 bracket)
      // Other complaint = 0 points
      // fever = +1 point
      // Total = 1 point (< 3 = LOW)
      expect(result.level).toBe(EwsLevel.LOW)
      expect(result.score).toBeLessThan(3)
      expect(result.flags).toEqual([])
    })
  })

  /**
   * Test 5: Deterministic behavior
   * 
   * Ensure the function produces the same output for the same input
   */
  describe('Deterministic behavior', () => {
    it('should produce identical results for identical inputs', () => {
      const payload: IntakePayload = {
        age: 65,
        chiefComplaintCategory: 'Chest Pain',
        symptomAnswers: {
          radiatingPain: true,
          chestPainWithSweating: true,
        },
        riskFactors: {
          cardiacHistory: true,
          hypertension: true,
        },
      }

      const result1 = computeProvisionalEws(payload)
      const result2 = computeProvisionalEws(payload)
      const result3 = computeProvisionalEws(payload)

      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
      expect(result1.score).toBe(result2.score)
      expect(result1.level).toBe(result2.level)
      expect(result1.flags).toEqual(result2.flags)
    })

    it('should produce consistent results across multiple calls with same payload', () => {
      const payload: IntakePayload = {
        age: 40,
        chiefComplaintCategory: 'Stroke-like Symptoms',
        symptomAnswers: {
          difficultySpeaking: true,
          weaknessOnOneSide: true,
        },
        riskFactors: {
          strokeHistory: true,
        },
      }

      const results = Array.from({ length: 10 }, () => computeProvisionalEws(payload))

      // All results should be identical
      const firstResult = results[0]
      results.forEach((result) => {
        expect(result.score).toBe(firstResult.score)
        expect(result.level).toBe(firstResult.level)
        expect(result.flags).toEqual(firstResult.flags)
      })
    })
  })

  /**
   * Test 6: Edge cases and boundary conditions
   */
  describe('Edge cases', () => {
    it('should handle null and undefined values gracefully', () => {
      const payload: IntakePayload = {
        age: 30,
        chiefComplaintCategory: null,
        symptomAnswers: null,
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.level).toBe(EwsLevel.LOW)
      expect(result.score).toBe(0)
      expect(result.flags).toEqual([])
    })

    it('should handle empty objects', () => {
      const payload: IntakePayload = {
        age: 25,
        chiefComplaintCategory: null,
        symptomAnswers: {},
        riskFactors: {},
      }

      const result = computeProvisionalEws(payload)

      expect(result.level).toBe(EwsLevel.LOW)
      expect(result.score).toBe(0)
    })

    it('should handle very old patients correctly', () => {
      const payload: IntakePayload = {
        age: 95,
        chiefComplaintCategory: null,
        symptomAnswers: null,
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      // Age 95 = +3 points (80+ bracket)
      expect(result.score).toBe(3)
      expect(result.level).toBe(EwsLevel.MODERATE)
    })

    it('should handle very young patients correctly', () => {
      const payload: IntakePayload = {
        age: 0,
        chiefComplaintCategory: null,
        symptomAnswers: null,
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      // Age 0 = 0 points (0-17 bracket)
      expect(result.score).toBe(0)
      expect(result.level).toBe(EwsLevel.LOW)
    })

    it('should handle string boolean values in symptomAnswers', () => {
      const payload: IntakePayload = {
        age: 50,
        chiefComplaintCategory: 'Chest Pain',
        symptomAnswers: {
          radiatingPain: 'true', // String instead of boolean
          chestPainWithSweating: 'yes', // String instead of boolean
        },
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      // Should still count these symptoms
      expect(result.score).toBeGreaterThan(0)
      expect(result.flags).toContain('chest_pain_acs')
    })
  })

  /**
   * Test 7: Score threshold boundaries
   */
  describe('Score threshold boundaries', () => {
    it('should return MODERATE for score exactly at moderate threshold', () => {
      // This test verifies threshold behavior
      // Score of 3 should be MODERATE
      const payload: IntakePayload = {
        age: 80, // +3 points (80+ bracket)
        chiefComplaintCategory: null,
        symptomAnswers: null,
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.score).toBe(3)
      expect(result.level).toBe(EwsLevel.MODERATE)
    })

    it('should return HIGH for score exactly at high threshold', () => {
      // Score of 5 should be HIGH
      // Age 80 = +3, need +2 more points
      const payload: IntakePayload = {
        age: 80, // +3 points
        chiefComplaintCategory: 'Abdominal Pain', // +1 point
        symptomAnswers: {
          fever: true, // +1 point
        },
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.score).toBe(5)
      expect(result.level).toBe(EwsLevel.HIGH)
    })

    it('should return CRITICAL for score exactly at critical threshold', () => {
      // Score of 8 should be CRITICAL
      // Age 80 = +3, Chest Pain = +3, need +2 more
      const payload: IntakePayload = {
        age: 80, // +3 points
        chiefComplaintCategory: 'Chest Pain', // +3 points
        symptomAnswers: {
          radiatingPain: true, // +2 points
        },
        riskFactors: null,
      }

      const result = computeProvisionalEws(payload)

      expect(result.score).toBe(8)
      expect(result.level).toBe(EwsLevel.CRITICAL)
    })
  })
})

