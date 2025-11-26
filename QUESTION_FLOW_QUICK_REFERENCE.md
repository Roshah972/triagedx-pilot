# Question Flow Quick Reference Guide

**For Clinical Staff - ER Triage**

---

## Chest Pain Questions

### Always Asked (Cannot Skip)
1. ⏱️ **When did pain start?** → Recent onset = higher concern
2. 📍 **Does pain radiate?** → Classic ACS red flag
3. 🫁 **Short of breath?** → ACS/PE concern
4. 📊 **Pain severity (1-10)?** → Guides triage level

### Sometimes Asked (Conditional)
5. 💧 **Sweating/cold sweats?** → If radiation OR SOB OR severity ≥5
6. 🤢 **Nausea/vomiting?** → If SOB OR radiation OR severity ≥5
7. 🏃 **Worse with activity?** → If recent onset (helps differentiate angina)
8. 👆 **Reproducible with pressure?** → ONLY if severity <5 AND no red flags (rules out musculoskeletal)

### Clinical Logic
- **Reproducible question**: Only shown for LOW-RISK patients to rule out musculoskeletal pain
- **Diaphoresis/nausea**: Shown if ANY concerning feature present (not just one specific feature)
- **All red flags**: Always assessed (radiation, SOB, severity)

---

## Fever Questions

### Always Asked (Cannot Skip)
1. 🌡️ **Max temperature?** → Baseline for all fever triage
2. ⏱️ **How long?** → Acute vs chronic infection
3. 😴 **Lethargic/very tired?** → Sepsis red flag
4. 🦴 **Stiff neck?** → Meningitis red flag
5. 🫁 **Breathing difficulty?** → Respiratory distress

### Sometimes Asked (Conditional)
6. 💧 **Drinking fluids?** → If lethargic OR temp >102°F
7. 👶 **Wet diapers?** → Infants/children only (dehydration)
8. 🔴 **Rash?** → If any fever >100.4°F (meningococcemia)
9. 🧠 **Confused?** → Adults/geriatric only (sepsis)

### Clinical Logic
- **Infant <3mo + fever >100.4°F**: Automatic RED triage
- **Meningitis red flags**: Stiff neck and rash prioritized
- **Age-appropriate questions**: Wet diapers for peds, confusion for adults

---

## Abdominal Pain Questions

### Always Asked (Cannot Skip)
1. 📍 **Where is pain?** → RLQ, LLQ, RUQ, LUQ, epigastric, generalized
2. ⚡ **Sudden or gradual?** → Sudden = higher concern
3. 📊 **Pain severity (1-10)?** → Guides triage level
4. 🤮 **Vomiting?** → Obstruction red flag
5. 🩸 **Blood in stool/vomit?** → GI bleed red flag

### Sometimes Asked (Conditional)
6. 💩 **Diarrhea?** → Always asked (helps differentiate gastroenteritis)
7. 🌡️ **Fever?** → If RLQ, RUQ, or generalized (surgical concern)
8. 🤰 **Pregnant/could be pregnant?** → Females of childbearing age with lower abd pain
9. 🩸 **Vaginal bleeding?** → If pregnant (ectopic concern)

### Clinical Logic
- **Ectopic pregnancy**: Only asked for females of childbearing age with lower abdominal pain
- **Fever question**: Shown for surgical concerns (RLQ = appendicitis, RUQ = cholecystitis)
- **All red flags**: Always assessed (vomiting, blood)

---

## Question Types

### Required Questions (Red Border)
- **Cannot be skipped**
- Critical for clinical triage
- Alert shown if skip attempted

### Optional Questions (No Border)
- Can be skipped if not relevant
- Provides additional context
- Skip button enabled

---

## Patient Context Filtering

### Age-Aware Questions
- **Wet diapers**: Only for infants/children
- **Confusion**: Only for adults/geriatric
- **Reproducible pain**: Only for adolescents/adults

### Sex-Aware Questions
- **Pregnancy questions**: Only for females of childbearing age
- **Atypical presentations**: System accounts for female chest pain presentations

---

## Safety Features

### ✅ Cannot Skip Critical Questions
- System prevents skipping required questions
- Alert shown if skip attempted
- All red flags always assessed

### ✅ No Auto-Advance
- Patient must click "Next" to proceed
- Allows review of answers
- Prevents accidental submission

### ✅ Validation
- Temperature range: 95°F - 110°F
- Pain severity: 1-10 scale
- Yes/No questions: Must select one

### ✅ Error Handling
- Graceful error messages
- Retry functionality
- Never crashes intake form

---

## Common Scenarios

### Scenario 1: Classic ACS Presentation
**Patient**: 65yo male, chest pain

**Questions Asked**:
1. Onset timing → JUST_NOW ✅
2. Radiation → Yes (to left arm) ✅
3. SOB → Yes ✅
4. Severity → 8/10 ✅
5. Diaphoresis → Yes (shown because radiation + SOB + high severity) ✅
6. Nausea → Yes (shown because SOB + radiation) ✅
7. Exertion → No ✅
8. Reproducible → NOT SHOWN (severity too high, red flags present) ✅

**Result**: RED triage (classic ACS pattern)

---

### Scenario 2: Infant Fever
**Patient**: 2-month-old, fever

**Questions Asked**:
1. Max temp → 101°F ✅
2. Duration → Since yesterday ✅
3. Lethargy → Yes ✅
4. Stiff neck → No ✅
5. Breathing difficulty → No ✅
6. Hydration → Poor (shown because lethargic + high fever) ✅
7. Wet diapers → <3 in 24hrs (shown because infant) ✅
8. Rash → No ✅
9. Confusion → NOT SHOWN (infant, not adult) ✅

**Result**: RED triage (infant <3mo + fever >100.4°F + lethargy + poor hydration)

---

### Scenario 3: Possible Ectopic Pregnancy
**Patient**: 28yo female, lower abdominal pain

**Questions Asked**:
1. Location → RLQ ✅
2. Onset → Sudden ✅
3. Severity → 9/10 ✅
4. Vomiting → Yes ✅
5. Blood in stool → No ✅
6. Diarrhea → No ✅
7. Fever → Yes (shown because RLQ) ✅
8. Pregnancy → Yes (shown because female + childbearing age + lower abd pain) ✅
9. Vaginal bleeding → Yes (shown because pregnant) ✅

**Result**: RED triage (ectopic pregnancy concern)

---

## Troubleshooting

### "Why isn't a question showing?"
- Check if patient context is appropriate (age/sex)
- Check if dependencies are met (previous answers)
- Check if question was already answered

### "Patient accidentally skipped a question"
- Required questions cannot be skipped (system prevents this)
- Optional questions can be skipped (by design)
- Patient can go back and answer skipped questions

### "Error message appeared"
- Click "Retry" button
- If error persists, use staff-assisted intake mode
- Report error to IT support

---

## Contact

**Technical Support**: IT Help Desk  
**Clinical Questions**: ER Medical Director  
**Workflow Issues**: Triage Nurse Manager

---

**Last Updated**: November 22, 2025  
**Version**: 1.0

