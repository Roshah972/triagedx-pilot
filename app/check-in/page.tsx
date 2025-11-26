'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { IntakeSource, Sex } from '@prisma/client'
import { useTour } from '@/contexts/DemoTourContext'
import { getSymptomQuestions, getComplaintCategories } from '@/lib/config/symptomQuestions'
import {
  getTranslations,
  complaintCategories as complaintCategoryTranslations,
  sexOptions,
  riskFactorLabels,
  type Language,
} from '@/lib/i18n/translations'
import { getTranslatedQuestionLabel } from '@/lib/i18n/symptomQuestionTranslations'
import Logo from '@/components/Logo'
import DynamicQuestionFlow from '@/components/DynamicQuestionFlow'
import Chip from '@/components/Chip'
import { calculateAge, calculateAgeBracket } from '@/lib/utils/age'
import { mapOldComplaintCategory } from '@/lib/triage/complaintMapper'
import { prismaSexToBiologicalSex } from '@/lib/triage/adapter'
import type { TriagePatientContext, ChiefComplaintCategory } from '@/lib/triage/types'
import styles from './page.module.css'

interface FormData {
  // Demographics
  firstName: string
  lastName: string
  dob: string
  sex: Sex | ''
  phone: string
  email: string
  addressLine1: string
  city: string
  state: string
  zipCode: string

  // Chief complaint
  chiefComplaintCategory: string
  chiefComplaintText: string

  // Symptoms and risk factors
  symptomAnswers: Record<string, any>
  riskFactors: Record<string, any>
}

type Step = 'demographics' | 'complaint' | 'symptoms' | 'review'

export default function CheckInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentStep: tourStep, goToStep, nextStep: tourNextStep } = useTour()
  const isKioskMode = searchParams.get('mode') === 'kiosk'

  const [currentStep, setCurrentStep] = useState<Step>('demographics')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const [accessibilityMode, setAccessibilityMode] = useState(false)

  const t = getTranslations(language)

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    dob: '',
    sex: '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    chiefComplaintCategory: '',
    chiefComplaintText: '',
    symptomAnswers: {},
    riskFactors: {},
  })

  const complaintCategories = getComplaintCategories()
  const symptomQuestions = formData.chiefComplaintCategory
    ? getSymptomQuestions(formData.chiefComplaintCategory)
    : []

  // Calculate patient context for dynamic question flow
  const getPatientContext = (): TriagePatientContext | null => {
    if (!formData.dob || !formData.sex) return null
    
    try {
      const dobDate = new Date(formData.dob + 'T00:00:00.000Z')
      const age = calculateAge(dobDate)
      const ageBracket = calculateAgeBracket(age)
      
      return {
        ageAtVisit: age,
        ageBracket,
        biologicalSex: prismaSexToBiologicalSex(formData.sex),
      }
    } catch {
      return null
    }
  }

  const patientContext = getPatientContext()
  const complaintCategory = formData.chiefComplaintCategory
    ? mapOldComplaintCategory(formData.chiefComplaintCategory)
    : null

  // Step validation
  const canProceedToComplaint = () => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.dob !== '' &&
      formData.sex !== ''
    )
  }

  const canProceedToSymptoms = () => {
    return formData.chiefComplaintCategory !== ''
  }

  const canProceedToReview = () => {
    return true // Symptoms are optional
  }

  const handleNext = () => {
    if (currentStep === 'demographics' && canProceedToComplaint()) {
      setCurrentStep('complaint')
    } else if (currentStep === 'complaint' && canProceedToSymptoms()) {
      setCurrentStep('symptoms')
    } else if (currentStep === 'symptoms' && canProceedToReview()) {
      setCurrentStep('review')
    }
  }

  const handleBack = () => {
    if (currentStep === 'complaint') {
      setCurrentStep('demographics')
    } else if (currentStep === 'symptoms') {
      setCurrentStep('complaint')
    } else if (currentStep === 'review') {
      setCurrentStep('symptoms')
    }
  }

  // Handle tour navigation
  useEffect(() => {
    if (tourStep === 'checkin-entry' && router) {
      // If we're on checkin-entry step, navigate to check-in page
      if (window.location.pathname !== '/check-in') {
        router.push('/check-in')
      }
    }
  }, [tourStep, router])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Convert DOB from YYYY-MM-DD to ISO datetime string
      let dobISO: string | null = null
      if (formData.dob) {
        // HTML date input returns YYYY-MM-DD, convert to ISO datetime
        const dobDate = new Date(formData.dob + 'T00:00:00.000Z')
        if (!isNaN(dobDate.getTime())) {
          dobISO = dobDate.toISOString()
        }
      }

      // Prepare payload, converting empty strings to null for optional fields
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName || null,
        dob: dobISO,
        sex: formData.sex || null,
        phone: formData.phone || null,
        email: formData.email || null,
        addressLine1: formData.addressLine1 || null,
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null,
        chiefComplaintCategory: formData.chiefComplaintCategory || null,
        chiefComplaintText: formData.chiefComplaintText || null,
        symptomAnswers: Object.keys(formData.symptomAnswers).length > 0 ? formData.symptomAnswers : null,
        riskFactors: Object.keys(formData.riskFactors).length > 0 ? formData.riskFactors : null,
        intakeSource: isKioskMode ? IntakeSource.KIOSK : IntakeSource.MOBILE,
      }

      const response = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to submit intake'
        try {
          const error = await response.json()
          // Show validation details if available
          if (error.details && Array.isArray(error.details)) {
            const errorMessages = error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
            errorMessage = error.error + ': ' + errorMessages
          } else if (error.error) {
            errorMessage = error.error
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Failed to submit intake (${response.status}: ${response.statusText})`
        }
        console.error('Intake submission error:', errorMessage)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setSubmitSuccess(true)

      // If in tour, advance to next step, then redirect
      if (tourStep === 'checkin-submit') {
        setTimeout(() => {
          tourNextStep()
          // Navigate to dashboard after tour step advances
          setTimeout(() => {
            const visitId = result.visitId || result.id || result.visit?.id
            router.push('/staff/dashboard')
          }, 500)
        }, 1000)
      } else {
        // Normal redirect after 3 seconds
        setTimeout(() => {
          const visitId = result.visitId || result.id || result.visit?.id
          const redirectUrl = visitId 
            ? `/check-in/success?visitId=${visitId}`
            : '/check-in/success'
          router.push(redirectUrl)
        }, 3000)
      }
    } catch (error: any) {
      setSubmitError(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateSymptomAnswer = (questionId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      symptomAnswers: { ...prev.symptomAnswers, [questionId]: value },
    }))
  }

  const updateRiskFactor = (factor: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      riskFactors: { ...prev.riskFactors, [factor]: value },
    }))
  }

  if (submitSuccess) {
    return (
      <div
        className={`${isKioskMode ? styles.kioskContainer : styles.mobileContainer} ${
          accessibilityMode ? styles.accessibilityMode : ''
        }`}
      >
        <div className={styles.successMessage}>
          <h1>{t.intakeSubmitted}</h1>
          <p>{t.waitToBeCalled}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${isKioskMode ? styles.kioskContainer : styles.mobileContainer} ${
        accessibilityMode ? styles.accessibilityMode : ''
      }`}
    >
      <div className={styles.checkInWrapper}>
        {/* Language and Accessibility Controls */}
        <div className={styles.controls}>
          <div className={styles.languageSelector}>
            <label htmlFor="language-select">Language / Idioma:</label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={styles.languageSelect}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div className={styles.accessibilityToggle}>
            <label htmlFor="accessibility-toggle">
              <input
                id="accessibility-toggle"
                type="checkbox"
                checked={accessibilityMode}
                onChange={(e) => setAccessibilityMode(e.target.checked)}
                className={styles.toggleCheckbox}
              />
              <span>Large Text / Texto Grande</span>
            </label>
          </div>
        </div>

        {/* Progress indicator */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${
                currentStep === 'demographics'
                  ? '25%'
                  : currentStep === 'complaint'
                  ? '50%'
                  : currentStep === 'symptoms'
                  ? '75%'
                  : '100%'
              }`,
            }}
          />
        </div>

        <Logo size="medium" className={styles.checkInLogo} />
        <h1 className={styles.pageTitle} data-tour-id="checkin-overview">{t.pageTitle}</h1>

        {/* Step 1: Demographics */}
        {currentStep === 'demographics' && (
          <div className={styles.stepContent} data-tour-id="checkin-demographics">
            <h2>{t.yourInformation}</h2>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">
                {t.firstName} {t.required}
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => updateFormData('firstName', e.target.value)}
                className={`${isKioskMode ? styles.kioskInput : ''} ${
                  accessibilityMode ? styles.accessibilityInput : ''
                }`}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="lastName">
                {t.lastName} {t.required}
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => updateFormData('lastName', e.target.value)}
                className={`${isKioskMode ? styles.kioskInput : ''} ${
                  accessibilityMode ? styles.accessibilityInput : ''
                }`}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="dob">
                {t.dob} {t.required}
              </label>
              <input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => updateFormData('dob', e.target.value)}
                className={`${isKioskMode ? styles.kioskInput : ''} ${
                  accessibilityMode ? styles.accessibilityInput : ''
                }`}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="sex">
                {t.sex} {t.required}
              </label>
              <select
                id="sex"
                value={formData.sex}
                onChange={(e) => updateFormData('sex', e.target.value)}
                className={`${isKioskMode ? styles.kioskInput : ''} ${
                  accessibilityMode ? styles.accessibilityInput : ''
                }`}
                required
              >
                <option value="">{t.select}</option>
                <option value={Sex.MALE}>{sexOptions[language].MALE}</option>
                <option value={Sex.FEMALE}>{sexOptions[language].FEMALE}</option>
                <option value={Sex.OTHER}>{sexOptions[language].OTHER}</option>
                <option value={Sex.UNKNOWN}>{sexOptions[language].UNKNOWN}</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">{t.phone}</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                className={`${isKioskMode ? styles.kioskInput : ''} ${
                  accessibilityMode ? styles.accessibilityInput : ''
                }`}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">{t.email}</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className={`${isKioskMode ? styles.kioskInput : ''} ${
                  accessibilityMode ? styles.accessibilityInput : ''
                }`}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="addressLine1">{t.address}</label>
              <input
                id="addressLine1"
                type="text"
                value={formData.addressLine1}
                onChange={(e) => updateFormData('addressLine1', e.target.value)}
                className={`${isKioskMode ? styles.kioskInput : ''} ${
                  accessibilityMode ? styles.accessibilityInput : ''
                }`}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="city">{t.city}</label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  className={`${isKioskMode ? styles.kioskInput : ''} ${
                    accessibilityMode ? styles.accessibilityInput : ''
                  }`}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="state">{t.state}</label>
                <input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                  className={`${isKioskMode ? styles.kioskInput : ''} ${
                    accessibilityMode ? styles.accessibilityInput : ''
                  }`}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="zipCode">{t.zipCode}</label>
                <input
                  id="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => updateFormData('zipCode', e.target.value)}
                  className={`${isKioskMode ? styles.kioskInput : ''} ${
                    accessibilityMode ? styles.accessibilityInput : ''
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Chief Complaint */}
        {currentStep === 'complaint' && (
          <div className={styles.stepContent} data-tour-id="checkin-complaint">
            <h2>{t.whatBringsYouIn}</h2>
            <p className={styles.stepDescription}>
              {language === 'es'
                ? 'Seleccione su motivo principal de consulta'
                : 'Select your main reason for visiting'}
            </p>
            <div className={styles.complaintChips}>
              {complaintCategories.map((cat) => (
                <Chip
                  key={cat.id}
                  label={complaintCategoryTranslations[language][cat.id] || cat.label}
                  value={cat.id}
                  selected={formData.chiefComplaintCategory === cat.id}
                  onClick={(value) => {
                    updateFormData('chiefComplaintCategory', value as string)
                  }}
                  variant="primary"
                  size={accessibilityMode ? 'large' : 'medium'}
                  multiSelect={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Symptom Questions - Dynamic Chip/Slide System */}
        {currentStep === 'symptoms' && (
          <div className={styles.stepContent} data-tour-id="checkin-vitals">
            <h2>{t.additionalQuestions}</h2>
            <p className={styles.stepDescription}>{t.answerQuestions}</p>

            {patientContext && complaintCategory ? (
              <DynamicQuestionFlow
                complaintCategory={complaintCategory}
                patientContext={patientContext}
                initialAnswers={formData.symptomAnswers}
                onAnswerChange={(answers) => {
                  setFormData((prev) => ({
                    ...prev,
                    symptomAnswers: answers,
                  }))
                }}
                onComplete={(answers) => {
                  setFormData((prev) => ({
                    ...prev,
                    symptomAnswers: answers,
                  }))
                  // DO NOT auto-advance - let user review and click Next
                  // This allows patients to review their answers before proceeding
                  // Auto-advance was too aggressive for actual ER use
                }}
                language={language}
                accessibilityMode={accessibilityMode}
              />
            ) : (
              <div className={styles.errorMessage}>
                {language === 'es'
                  ? 'Por favor complete la información demográfica primero'
                  : 'Please complete demographic information first'}
              </div>
            )}

            {/* Risk Factors - Keep as chips */}
            <div className={styles.riskFactorsSection}>
              <h3>{t.medicalHistory}</h3>
              <p className={styles.stepDescription}>{t.selectAllThatApply}</p>
              <div className={styles.riskFactorChips}>
                {[
                  { id: 'cardiacHistory' },
                  { id: 'strokeHistory' },
                  { id: 'diabetes' },
                  { id: 'hypertension' },
                  { id: 'pregnancy' },
                  { id: 'anticoagulantUse' },
                  { id: 'cancerHistory' },
                ].map((factor) => (
                  <Chip
                    key={factor.id}
                    label={riskFactorLabels[language][factor.id] || factor.id}
                    value={factor.id}
                    selected={formData.riskFactors[factor.id] === true}
                    onClick={(value) => {
                      const factorId = value as string
                      updateRiskFactor(factorId, !formData.riskFactors[factorId])
                    }}
                    variant="default"
                    size={accessibilityMode ? 'large' : 'medium'}
                    multiSelect={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div className={styles.stepContent}>
            <h2>{t.reviewYourInformation}</h2>
            <div className={styles.reviewSection}>
              <h3>{t.personalInformation}</h3>
              <p>
                <strong>{t.firstName} {t.lastName}:</strong> {formData.firstName}{' '}
                {formData.lastName}
              </p>
              <p>
                <strong>{t.dob}:</strong> {formData.dob}
              </p>
              <p>
                <strong>{t.sex}:</strong>{' '}
                {formData.sex ? sexOptions[language][formData.sex] || formData.sex : ''}
              </p>
              {formData.phone && (
                <p>
                  <strong>{t.phone}:</strong> {formData.phone}
                </p>
              )}
            </div>
            <div className={styles.reviewSection}>
              <h3>{t.chiefComplaint}</h3>
              <p>
                <strong>
                  {language === 'es' ? 'Categoría' : 'Category'}:
                </strong>{' '}
                {formData.chiefComplaintCategory
                  ? complaintCategoryTranslations[language][formData.chiefComplaintCategory] ||
                    formData.chiefComplaintCategory
                  : ''}
              </p>
            </div>
            {Object.keys(formData.symptomAnswers).length > 0 && (
              <div className={styles.reviewSection}>
                <h3>{t.symptoms}</h3>
                {Object.entries(formData.symptomAnswers).map(([key, value]) => (
                  <p key={key}>
                    <strong>{getTranslatedQuestionLabel(key, language)}:</strong>{' '}
                    {value === true ? t.yes : value === false ? t.no : String(value)}
                  </p>
                ))}
              </div>
            )}
            {Object.keys(formData.riskFactors).filter((k) => formData.riskFactors[k]).length >
              0 && (
              <div className={styles.reviewSection}>
                <h3>{t.medicalHistory}</h3>
                {Object.entries(formData.riskFactors)
                  .filter(([_, value]) => value)
                  .map(([key, _]) => (
                    <p key={key}>{riskFactorLabels[language][key] || key}</p>
                  ))}
              </div>
            )}

            {submitError && <div className={styles.errorMessage}>{submitError}</div>}
          </div>
        )}

        {/* Navigation buttons */}
        <div className={styles.navigationButtons}>
          {currentStep !== 'demographics' && (
            <button
              type="button"
              onClick={handleBack}
              className={`${styles.navButton} ${styles.backButton} ${
                isKioskMode ? styles.kioskButton : ''
              } ${accessibilityMode ? styles.accessibilityButton : ''}`}
            >
              {t.back}
            </button>
          )}
          {currentStep !== 'review' ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                (currentStep === 'demographics' && !canProceedToComplaint()) ||
                (currentStep === 'complaint' && !canProceedToSymptoms()) ||
                (currentStep === 'symptoms' && !canProceedToReview())
              }
              className={`${styles.navButton} ${styles.nextButton} ${
                isKioskMode ? styles.kioskButton : ''
              } ${accessibilityMode ? styles.accessibilityButton : ''}`}
            >
              {t.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await handleSubmit()
                // Auto-advance tour after successful submit
                if (tourStep === 'checkin-submit') {
                  setTimeout(() => {
                    tourNextStep()
                  }, 1000)
                }
              }}
              disabled={isSubmitting}
              data-tour-id="checkin-submit"
              className={`${styles.navButton} ${styles.submitButton} ${
                isKioskMode ? styles.kioskButton : ''
              } ${accessibilityMode ? styles.accessibilityButton : ''}`}
            >
              {isSubmitting ? t.submitting : t.submit}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

