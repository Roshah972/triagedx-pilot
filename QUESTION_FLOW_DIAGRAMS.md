# Question Flow Diagrams

Visual representation of the clinical logic for each complaint category.

---

## Chest Pain Flow

```
START
  ↓
[1] Onset Timing (REQUIRED)
  ↓
[2] Radiation (REQUIRED)
  ↓
[3] Shortness of Breath (REQUIRED)
  ↓
[4] Severity 1-10 (REQUIRED)
  ↓
  ├─→ If Radiation OR SOB OR Severity ≥5
  │     ↓
  │   [5] Diaphoresis (sweating)
  │     ↓
  │   [6] Nausea
  │
  ├─→ If Recent Onset (≤few hours)
  │     ↓
  │   [7] Exertion-related
  │
  └─→ If Severity <5 AND No Red Flags
        ↓
      [8] Reproducible with pressure
        ↓
      END
```

### Clinical Decision Points

**High Risk Path** (Radiation OR SOB OR Severity ≥5):
```
Onset: JUST_NOW
Radiation: YES
SOB: YES
Severity: 8/10
  ↓
Diaphoresis: Asked ✅
Nausea: Asked ✅
Exertion: Asked ✅
Reproducible: NOT Asked ✅ (too high risk)
  ↓
Result: RED triage (classic ACS)
```

**Low Risk Path** (No red flags, low severity):
```
Onset: DAYS
Radiation: NO
SOB: NO
Severity: 3/10
  ↓
Diaphoresis: NOT Asked (no concerning features)
Nausea: NOT Asked (no concerning features)
Exertion: NOT Asked (not recent onset)
Reproducible: Asked ✅ (low risk, helps rule out musculoskeletal)
  ↓
Result: YELLOW triage (likely musculoskeletal)
```

---

## Fever Flow

```
START
  ↓
[1] Max Temperature (REQUIRED)
  ↓
[2] Duration (REQUIRED)
  ↓
[3] Lethargy (REQUIRED)
  ↓
[4] Stiff Neck (REQUIRED) ← Meningitis red flag
  ↓
[5] Breathing Difficulty (REQUIRED)
  ↓
  ├─→ If Lethargic OR Temp >102°F
  │     ↓
  │   [6] Hydration status
  │
  ├─→ If Infant/Child age bracket
  │     ↓
  │   [7] Wet diapers (pediatric dehydration)
  │
  ├─→ If Any Fever >100.4°F
  │     ↓
  │   [8] Rash (meningococcemia concern)
  │
  └─→ If Adult/Geriatric age bracket
        ↓
      [9] Confusion (sepsis concern)
        ↓
      END
```

### Clinical Decision Points

**Infant High Risk** (<3 months old):
```
Age: 2 months
Temp: 101°F
Duration: Since yesterday
Lethargy: YES
Stiff Neck: NO
Breathing: NO
  ↓
Hydration: Asked ✅ (lethargic + high fever)
Wet Diapers: Asked ✅ (infant)
Rash: Asked ✅ (fever >100.4°F)
Confusion: NOT Asked (infant, not adult)
  ↓
Result: RED triage (infant <3mo + fever + lethargy)
```

**Adult Moderate Risk**:
```
Age: 45 years
Temp: 102.5°F
Duration: 2 days
Lethargy: NO
Stiff Neck: NO
Breathing: NO
  ↓
Hydration: Asked ✅ (temp >102°F)
Wet Diapers: NOT Asked (adult)
Rash: Asked ✅ (fever >100.4°F)
Confusion: Asked ✅ (adult)
  ↓
Result: YELLOW triage (moderate fever, no red flags)
```

---

## Abdominal Pain Flow

```
START
  ↓
[1] Location (REQUIRED)
  ↓
[2] Onset Type: Sudden/Gradual (REQUIRED)
  ↓
[3] Severity 1-10 (REQUIRED)
  ↓
[4] Vomiting (REQUIRED)
  ↓
[5] Blood in Stool/Vomit (REQUIRED)
  ↓
[6] Diarrhea (Always asked)
  ↓
  ├─→ If RLQ, RUQ, or Generalized
  │     ↓
  │   [7] Fever (surgical concern)
  │
  └─→ If Female + Childbearing Age + Lower Abd Pain
        ↓
      [8] Pregnancy status
        ↓
        If Pregnant
          ↓
        [9] Vaginal bleeding (ectopic concern)
          ↓
        END
```

### Clinical Decision Points

**Ectopic Pregnancy Concern** (Female, childbearing age):
```
Age: 28 years
Sex: Female
Location: RLQ
Onset: SUDDEN
Severity: 9/10
Vomiting: YES
Blood: NO
Diarrhea: NO
  ↓
Fever: Asked ✅ (RLQ = appendicitis concern)
Pregnancy: Asked ✅ (female + childbearing age + lower abd pain)
  ↓
Pregnancy: YES
  ↓
Vaginal Bleeding: Asked ✅ (pregnant)
  ↓
Vaginal Bleeding: YES
  ↓
Result: RED triage (ectopic pregnancy concern)
```

**Appendicitis Concern** (Male):
```
Age: 22 years
Sex: Male
Location: RLQ
Onset: GRADUAL
Severity: 7/10
Vomiting: YES
Blood: NO
Diarrhea: NO
  ↓
Fever: Asked ✅ (RLQ)
Pregnancy: NOT Asked (male)
  ↓
Fever: YES
  ↓
Result: ORANGE triage (appendicitis concern)
```

---

## Dependency Logic Patterns

### Pattern 1: OR Logic (Multiple Triggers)

**Example**: Diaphoresis in Chest Pain
```
Show Diaphoresis IF:
  Radiation = YES
  OR
  SOB = YES
  OR
  Severity ≥ 5

Implementation:
dependencies: [{
  dependsOn: 'radiation',
  condition: (answer, allAnswers) => {
    return answer === true || 
           allAnswers.shortness_of_breath === true ||
           (parseInt(allAnswers.severity) >= 5);
  }
}]
```

**Why OR Logic?**
- Catches more high-risk patients
- Multiple pathways to trigger important questions
- Prevents missing atypical presentations

---

### Pattern 2: AND Logic (All Required)

**Example**: Vaginal Bleeding in Abdominal Pain
```
Show Vaginal Bleeding IF:
  Female = YES
  AND
  Childbearing Age = YES
  AND
  Lower Abdominal Pain = YES
  AND
  Pregnancy = YES

Implementation:
dependencies: [{
  dependsOn: 'pregnancy',
  condition: (answer) => answer === true
}]
// showIf handles age/sex filtering
```

**Why AND Logic?**
- Prevents inappropriate questions
- Ensures clinical relevance
- Reduces patient burden

---

### Pattern 3: Threshold Logic

**Example**: Reproducible Pain in Chest Pain
```
Show Reproducible IF:
  Severity < 5
  AND
  Radiation = NO
  AND
  SOB = NO
  AND
  Diaphoresis = NO

Implementation:
dependencies: [{
  dependsOn: 'severity',
  condition: (answer, allAnswers) => {
    const severity = parseInt(answer);
    const hasRedFlags = 
      allAnswers.radiation === true || 
      allAnswers.shortness_of_breath === true ||
      allAnswers.diaphoresis === true;
    return severity < 5 && !hasRedFlags;
  }
}]
```

**Why Threshold Logic?**
- Only asks for low-risk patients
- Prevents false reassurance
- Correctly identifies musculoskeletal pain

---

## Age/Sex Filtering

### Age Brackets
```
INFANT:      0-1 years
CHILD:       2-11 years
ADOLESCENT:  12-17 years
ADULT:       18-64 years
GERIATRIC:   65+ years
```

### Age-Specific Questions

**Wet Diapers** (Fever):
```
showIf: (context) => {
  return context.ageBracket === 'INFANT' || 
         context.ageBracket === 'CHILD';
}
```

**Confusion** (Fever):
```
showIf: (context) => {
  return context.ageBracket === 'ADULT' || 
         context.ageBracket === 'GERIATRIC';
}
```

**Reproducible Pain** (Chest Pain):
```
showIf: (context) => {
  return context.ageBracket === 'ADOLESCENT' || 
         context.ageBracket === 'ADULT';
}
```

### Sex-Specific Questions

**Pregnancy Questions** (Abdominal Pain):
```
showIf: (context) => {
  return context.biologicalSex === 'FEMALE' &&
         (context.ageBracket === 'ADOLESCENT' || 
          context.ageBracket === 'ADULT');
}
```

---

## Safety Mechanisms Flowchart

```
User Selects Answer
  ↓
Validate Answer
  ├─→ Invalid? → Show Alert → Return to Question
  │
  └─→ Valid?
        ↓
      Is Question Required?
        ├─→ Yes → Is Answer Empty?
        │           ├─→ Yes → Show Alert → Return to Question
        │           └─→ No → Continue
        │
        └─→ No → Continue
              ↓
            Record Answer
              ↓
            Update Flow State
              ↓
            Rebuild Visible Questions
              ↓
            Any Visible Questions?
              ├─→ Yes → Show Next Question
              │
              └─→ No → Any Unanswered Questions?
                        ├─→ Yes → Show First Unanswered (Fallback)
                        │
                        └─→ No → Questions Complete
```

---

## Error Handling Flowchart

```
Question Flow Operation
  ↓
Try {
  Execute Operation
    ↓
  Success? → Continue
}
  ↓
Catch (Error) {
  Log Error
    ↓
  Show Error Message
    ↓
  Offer Retry
    ↓
  User Clicks Retry?
    ├─→ Yes → Rebuild Flow → Continue
    │
    └─→ No → Show Fallback Question
}
```

---

## Priority System

### Priority Levels

```
Priority 1-5:   CRITICAL (always asked, cannot skip)
Priority 6-7:   SYMPTOMS (conditional, can skip)
Priority 8-9:   ASSESSMENT (conditional, can skip)
```

### Example: Chest Pain Priorities

```
Priority 1: Onset Timing          [CRITICAL]
Priority 2: Radiation             [CRITICAL]
Priority 3: Shortness of Breath   [CRITICAL]
Priority 4: Severity              [CRITICAL]
Priority 5: Diaphoresis           [SYMPTOMS]
Priority 6: Nausea                [SYMPTOMS]
Priority 7: Exertion              [SYMPTOMS]
Priority 8: Reproducible          [ASSESSMENT]
```

**Why This Order?**
1. Time-critical information first (onset)
2. Red flags next (radiation, SOB)
3. Severity for triage scoring
4. Additional symptoms if concerning
5. Context questions last

---

## Visual Legend

```
[REQUIRED]     = Cannot be skipped
(CONDITIONAL)  = Only shown if dependencies met
{OPTIONAL}     = Can be skipped

→  = Always flows to next
├─→ = Conditional branch
└─→ = Else branch
```

---

**Document Version:** 1.0  
**Last Updated:** November 22, 2025  
**For**: Clinical staff and developers

