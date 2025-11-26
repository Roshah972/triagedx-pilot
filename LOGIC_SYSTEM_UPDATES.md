# Logic System Updates - November 22, 2025

## Summary of Changes

This document outlines all changes made to ensure the dynamic question flow system is safe and appropriate for actual ER use.

---

## 1. Critical Issues Fixed

### Issue #1: Dependency Logic Conflicts
**Problem**: Questions could be hidden due to overly restrictive dependencies.

**Example**: Diaphoresis only shown if radiation was true, missing patients with SOB + diaphoresis (also concerning for ACS).

**Fix**: Changed to OR logic - diaphoresis shown if radiation OR SOB OR severity ≥5.

**Files Changed**:
- `lib/triage/enhancedComplaintConfig.ts`

---

### Issue #2: Severity-Based Branching Was Backwards
**Problem**: "Reproducible pain" question shown for high-severity patients, which could falsely reassure about cardiac pain.

**Example**: Patient with severity 8/10 chest pain could indicate pain is reproducible, potentially delaying cardiac workup.

**Fix**: Reproducible question only shown if severity <5 AND no red flags present. This correctly identifies low-risk musculoskeletal pain.

**Files Changed**:
- `lib/triage/enhancedComplaintConfig.ts`

---

### Issue #3: Critical Questions Could Be Skipped
**Problem**: No validation preventing users from skipping required questions.

**Example**: Patient could skip "radiation" question in chest pain, missing critical ACS red flag.

**Fix**: 
- Added `required` and `skippable` flags to all questions
- Added validation in `handleAnswer` and `handleSkip` functions
- Alert shown if user tries to skip required question
- Skip button disabled for required questions

**Files Changed**:
- `lib/triage/enhancedComplaintConfig.ts`
- `components/DynamicQuestionFlow.tsx`

---

### Issue #4: Auto-Advance Too Aggressive
**Problem**: Questions auto-advanced to review step immediately after completion, not allowing patient to review answers.

**Example**: Patient completes last question, immediately jumps to review page without seeing "Questions Complete" message.

**Fix**: Removed auto-advance behavior. Patient must click "Next" to proceed to review.

**Files Changed**:
- `app/check-in/page.tsx`
- `components/DynamicQuestionFlow.tsx` (updated completion message)

---

### Issue #5: Missing Error Handling
**Problem**: No error handling for edge cases (invalid patient context, circular dependencies, etc.).

**Example**: If question flow builder throws error, entire intake form crashes.

**Fix**:
- Added try-catch blocks around all question flow operations
- Added error state and error message display
- Added retry functionality
- Added fallback mechanism if no visible questions but unanswered questions exist

**Files Changed**:
- `lib/triage/questionEngine.ts`
- `components/DynamicQuestionFlow.tsx`

---

## 2. Enhanced Complaint Configurations

### Chest Pain (CHEST_PAIN)

**Changes**:
1. Moved severity question up to priority 4 (need early for branching logic)
2. Changed diaphoresis dependency to OR logic (radiation OR SOB OR severity ≥5)
3. Changed nausea dependency to OR logic (SOB OR radiation OR severity ≥5)
4. Changed reproducible dependency to only show for low-risk (severity <5 AND no red flags)
5. Added `required: true` and `skippable: false` to critical questions

**Clinical Rationale**:
- Onset timing, radiation, SOB, severity are ALWAYS asked (critical red flags)
- Diaphoresis/nausea asked if ANY concerning feature present (not just one specific feature)
- Reproducible only asked for low-risk patients (prevents false reassurance)

---

### Fever (FEVER)

**Changes**:
1. Moved stiff neck and breathing difficulty up to priorities 4-5 (critical red flags)
2. Changed hydration dependency to show if lethargic OR high fever (not just lethargic)
3. Changed rash dependency to show for any fever >100.4°F (not just >101°F)
4. Added `required: true` and `skippable: false` to critical questions

**Clinical Rationale**:
- Temperature, duration, lethargy, stiff neck, breathing are ALWAYS asked
- Meningitis red flags (stiff neck, rash) prioritized
- Hydration assessed for any high-risk patient (lethargic OR high fever)

---

### Abdominal Pain (ABDOMINAL_PAIN)

**Changes**:
1. Moved severity and blood_stool up to priorities 3 and 5 (critical for triage)
2. Changed vomiting to always asked (not conditional on onset type)
3. Changed blood_stool to always asked (critical red flag)
4. Changed diarrhea to always asked (helps differentiate gastroenteritis)
5. Changed fever dependency to show for RLQ, RUQ, or generalized (not just RLQ)
6. Added `required: true` and `skippable: false` to critical questions

**Clinical Rationale**:
- Location, onset, severity, vomiting, blood are ALWAYS asked
- Fever asked for surgical concerns (RLQ = appendicitis, RUQ = cholecystitis)
- Pregnancy questions only for appropriate patients (female, childbearing age, lower abd pain)

---

## 3. Question Engine Improvements

### Visibility Evaluation

**Changes**:
1. `showIf` evaluated FIRST (age/sex filtering before dependencies)
2. Added null/undefined check for dependent answers (prevents premature display)
3. Added safety comment explaining AND logic for dependencies

**Clinical Rationale**:
- Age/sex filtering is about patient appropriateness (comes first)
- Dependencies are about clinical logic (comes second)
- Prevents questions from appearing before their dependencies are answered

---

### Validation

**Changes**:
1. Added type-specific validation (boolean, number, choice, scale)
2. Added temperature range validation (95°F - 110°F)
3. Added choice validation (must be one of valid options)
4. Improved error messages ("This question is required for clinical triage")

**Clinical Rationale**:
- Prevents impossible values (temperature >110°F)
- Ensures data quality for triage scoring
- Clear error messages help patients understand why validation failed

---

### Visible Questions Builder

**Changes**:
1. Added try-catch around entire function
2. Added fallback mechanism if no visible questions but unanswered questions exist
3. Added error logging for visibility evaluation failures
4. Added fail-safe: if error evaluating visibility, show question anyway

**Clinical Rationale**:
- Prevents getting stuck with no questions to answer
- Fail-safe ensures critical questions are never hidden due to bugs
- Error logging helps identify and fix issues

---

## 4. Component Improvements

### DynamicQuestionFlow Component

**Changes**:
1. Added error state and error message display
2. Added try-catch blocks around all state updates
3. Added retry functionality for errors
4. Added validation alerts for required questions
5. Updated completion message to prompt user to click "Next"
6. Added transition delay for smooth UX

**Clinical Rationale**:
- Graceful error handling prevents intake form crashes
- Clear error messages help patients recover from errors
- Validation alerts prevent skipping critical questions

---

## 5. Testing Recommendations

### Unit Tests to Add

1. **Dependency Logic Tests**
   ```typescript
   test('diaphoresis shown if radiation OR SOB OR severity >= 5', () => {
     // Test each condition independently
   });
   ```

2. **Validation Tests**
   ```typescript
   test('cannot skip required questions', () => {
     // Test skip button disabled for required questions
   });
   ```

3. **Edge Case Tests**
   ```typescript
   test('fallback mechanism when no visible questions', () => {
     // Test that first unanswered question is shown
   });
   ```

### Integration Tests to Add

1. **Complete Flow Tests**
   ```typescript
   test('chest pain flow: classic ACS presentation', () => {
     // Test that all critical questions are asked
     // Test that triage score is RED
   });
   ```

2. **Clinical Scenario Tests**
   ```typescript
   test('infant fever <3mo with temp >100.4F', () => {
     // Test that triage score is RED
     // Test that appropriate pediatric questions are shown
   });
   ```

---

## 6. Files Changed

### Modified Files
1. `lib/triage/enhancedComplaintConfig.ts` - Updated all three complaint configs
2. `lib/triage/questionEngine.ts` - Improved visibility evaluation and validation
3. `components/DynamicQuestionFlow.tsx` - Added error handling and validation
4. `app/check-in/page.tsx` - Removed auto-advance behavior

### New Files
1. `CLINICAL_LOGIC_REVIEW.md` - Comprehensive clinical logic documentation
2. `LOGIC_SYSTEM_UPDATES.md` - This file (summary of changes)

---

## 7. Before/After Examples

### Example 1: Chest Pain with SOB but No Radiation

**Before**:
1. Onset timing → JUST_NOW
2. Radiation → No
3. SOB → Yes
4. Severity → 8/10
5. ❌ Diaphoresis question NOT shown (dependency only checked radiation)
6. ❌ Nausea question NOT shown (dependency only checked SOB, but needed both)

**After**:
1. Onset timing → JUST_NOW
2. Radiation → No
3. SOB → Yes
4. Severity → 8/10
5. ✅ Diaphoresis question SHOWN (OR logic: SOB is true)
6. ✅ Nausea question SHOWN (OR logic: SOB is true)

**Clinical Impact**: Catches more ACS cases with atypical presentations.

---

### Example 2: Low-Risk Chest Pain

**Before**:
1. Onset timing → DAYS
2. Radiation → No
3. SOB → No
4. Severity → 3/10
5. ❌ Reproducible question shown even for severity 8/10 (backwards logic)

**After**:
1. Onset timing → DAYS
2. Radiation → No
3. SOB → No
4. Severity → 3/10
5. ✅ Reproducible question SHOWN (severity <5 AND no red flags)
6. If severity was 8/10, reproducible would NOT be shown (prevents false reassurance)

**Clinical Impact**: Correctly identifies musculoskeletal pain in low-risk patients only.

---

### Example 3: Required Question Skip Attempt

**Before**:
1. User tries to skip "radiation" question
2. ❌ Question skipped, critical red flag missed

**After**:
1. User tries to skip "radiation" question
2. ✅ Alert shown: "This question is required for clinical triage and cannot be skipped"
3. User must answer question to proceed

**Clinical Impact**: Ensures all critical red flags are assessed.

---

## 8. Deployment Checklist

### Pre-Deployment
- [x] Code changes completed
- [x] Clinical logic documented
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Clinical staff review completed
- [ ] Accessibility testing completed
- [ ] Mobile testing completed

### Post-Deployment
- [ ] Monitor question completion rates
- [ ] Monitor skip attempt rates
- [ ] Monitor error rates
- [ ] Collect staff feedback
- [ ] Collect patient feedback

---

## 9. Next Steps

1. **Write Unit Tests**: Add tests for all dependency logic and validation
2. **Write Integration Tests**: Add tests for complete clinical scenarios
3. **Clinical Review**: Have ER physicians review question flows
4. **Staff Training**: Train triage nurses on new system
5. **Pilot Testing**: Test with small group of patients before full rollout

---

## 10. Contact

For questions about these changes:
- **Technical**: Development team
- **Clinical**: ER Medical Director
- **Workflow**: Triage Nurse Manager

---

**Document Version:** 1.0  
**Date:** November 22, 2025  
**Author:** AI Assistant (Code Review and Updates)

