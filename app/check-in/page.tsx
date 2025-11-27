'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
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
import DemoGuide from '@/components/DemoGuide'
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

  // Insurance Information
  insuranceStatus: 'HAS_INSURANCE' | 'SELF_PAY' | 'UNKNOWN' | ''
  insuranceCarrierName: string
  planName: string
  policyId: string
  groupNumber: string
  planType: 'PPO' | 'HMO' | 'EPO' | 'POS' | 'MEDICARE' | 'MEDICAID' | 'TRICARE' | 'OTHER' | ''
  subscriberIsPatient: boolean
  subscriberFullName: string
  subscriberDOB: string
  subscriberRelationshipToPatient: 'SELF' | 'PARENT' | 'SPOUSE' | 'CHILD' | 'OTHER' | ''
  subscriberEmployerName: string
  guarantorIsSubscriber: boolean
  guarantorFullName: string
  guarantorRelationshipToPatient: 'SELF' | 'PARENT' | 'SPOUSE' | 'CHILD' | 'OTHER' | ''
  guarantorAddressLine1: string
  guarantorAddressLine2: string
  guarantorCity: string
  guarantorState: string
  guarantorZip: string
  guarantorPhoneNumber: string
  cardFrontImageUrl: string | null
  cardBackImageUrl: string | null
  wantsFinancialAssistance: boolean

  // ID Document
  idDocumentType: 'DRIVERS_LICENSE' | 'STATE_ID' | 'PASSPORT' | 'OTHER' | ''
  idDocumentImage: File | null

  // Chief complaint
  chiefComplaintCategory: string
  chiefComplaintText: string

  // Symptoms and risk factors
  symptomAnswers: Record<string, any>
  riskFactors: Record<string, any>
}

type Step = 'demographics' | 'registration' | 'insurance' | 'complaint' | 'symptoms' | 'review'

export default function CheckInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { currentStep: tourStep, goToStep, nextStep: tourNextStep, isActive: tourActive } = useTour()
  const isKioskMode = searchParams.get('mode') === 'kiosk'

  const [currentStep, setCurrentStep] = useState<Step>('demographics')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const [accessibilityMode, setAccessibilityMode] = useState(false)

  const t = getTranslations(language)

  const getDemoFormData = (): FormData => ({
    firstName: 'John',
    lastName: 'Smith',
    dob: '1985-05-15',
    sex: Sex.MALE,
    phone: '555-123-4567',
    email: 'john.smith@example.com',
    addressLine1: '123 Main Street',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    insuranceStatus: 'HAS_INSURANCE',
    insuranceCarrierName: 'Blue Cross Blue Shield',
    planName: 'PPO Plan',
    policyId: 'BC123456789',
    groupNumber: 'GRP001',
    planType: 'PPO',
    subscriberIsPatient: true,
    subscriberFullName: '',
    subscriberDOB: '',
    subscriberRelationshipToPatient: '',
    subscriberEmployerName: '',
    guarantorIsSubscriber: true,
    guarantorFullName: '',
    guarantorRelationshipToPatient: '',
    guarantorAddressLine1: '',
    guarantorAddressLine2: '',
    guarantorCity: '',
    guarantorState: '',
    guarantorZip: '',
    guarantorPhoneNumber: '',
    cardFrontImageUrl: null,
    cardBackImageUrl: null,
    wantsFinancialAssistance: false,
    idDocumentType: '',
    idDocumentImage: null,
    chiefComplaintCategory: 'CHEST_PAIN',
    chiefComplaintText: 'Chest pain started 30 minutes ago',
    symptomAnswers: {
      'chest_pain_severity': 'moderate',
      'chest_pain_radiates': true,
      'shortness_of_breath': true,
    },
    riskFactors: {
      'hypertension': true,
      'diabetes': false,
    },
  })

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
    insuranceStatus: '',
    insuranceCarrierName: '',
    planName: '',
    policyId: '',
    groupNumber: '',
    planType: '',
    subscriberIsPatient: true,
    subscriberFullName: '',
    subscriberDOB: '',
    subscriberRelationshipToPatient: '',
    subscriberEmployerName: '',
    guarantorIsSubscriber: true,
    guarantorFullName: '',
    guarantorRelationshipToPatient: '',
    guarantorAddressLine1: '',
    guarantorAddressLine2: '',
    guarantorCity: '',
    guarantorState: '',
    guarantorZip: '',
    guarantorPhoneNumber: '',
    cardFrontImageUrl: null,
    cardBackImageUrl: null,
    wantsFinancialAssistance: false,
    idDocumentType: '',
    idDocumentImage: null,
    chiefComplaintCategory: '',
    chiefComplaintText: '',
    symptomAnswers: {},
    riskFactors: {},
  })
  
  // Pre-fill form when demo starts on check-in page
  useEffect(() => {
    if (pathname === '/check-in' && !formData.firstName) {
      // Auto-fill demo data when on check-in page
      setFormData(getDemoFormData())
      setCurrentStep('demographics')
    }
  }, [pathname])

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
  const canProceedToRegistration = () => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.dob !== '' &&
      formData.sex !== ''
    )
  }

  const canProceedToInsurance = () => {
    return true // Registration fields are optional
  }

  const canProceedToComplaint = () => {
    // Insurance step is optional - can proceed regardless
    return true
  }

  const canProceedToSymptoms = () => {
    return formData.chiefComplaintCategory !== ''
  }

  const canProceedToReview = () => {
    return true // Symptoms are optional
  }

  const handleNext = () => {
    // Normal form navigation
    if (currentStep === 'demographics' && canProceedToRegistration()) {
      setCurrentStep('registration')
    } else if (currentStep === 'registration' && canProceedToInsurance()) {
      setCurrentStep('insurance')
    } else if (currentStep === 'insurance' && canProceedToComplaint()) {
      setCurrentStep('complaint')
    } else if (currentStep === 'complaint' && canProceedToSymptoms()) {
      setCurrentStep('symptoms')
    } else if (currentStep === 'symptoms' && canProceedToReview()) {
      setCurrentStep('review')
    }
  }

  // Dispatch form step change event for demo guide
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('formStepChange', { 
        detail: { step: currentStep } 
      }))
    }
  }, [currentStep])

  // Listen for next step from demo guide
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleNextFormStep = () => {
        handleNext()
      }
      window.addEventListener('nextFormStep', handleNextFormStep)
      return () => window.removeEventListener('nextFormStep', handleNextFormStep)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  const handleBack = () => {
    if (currentStep === 'registration') {
      setCurrentStep('demographics')
    } else if (currentStep === 'insurance') {
      setCurrentStep('registration')
    } else if (currentStep === 'complaint') {
      setCurrentStep('insurance')
    } else if (currentStep === 'symptoms') {
      setCurrentStep('complaint')
    } else if (currentStep === 'review') {
      setCurrentStep('symptoms')
    }
  }

  // Handle tour navigation - auto-advance form steps when tour progresses
  useEffect(() => {
    if (!tourActive || !tourStep) return

    // When tour step changes, advance form to matching step
    if (tourStep === 'form-demographics' && currentStep !== 'demographics') {
      setCurrentStep('demographics')
    } else if (tourStep === 'form-complaint' && currentStep !== 'complaint') {
      setCurrentStep('complaint')
    } else if (tourStep === 'form-symptoms' && currentStep !== 'symptoms') {
      setCurrentStep('symptoms')
    } else if (tourStep === 'form-submit' && currentStep !== 'review') {
      setCurrentStep('review')
    }
  }, [tourStep, tourActive, currentStep])

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
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim() || null,
        dob: dobISO,
        sex: formData.sex || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        addressLine1: formData.addressLine1.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zipCode: formData.zipCode.trim() || null,
        chiefComplaintCategory: formData.chiefComplaintCategory || null,
        chiefComplaintText: formData.chiefComplaintText.trim() || null,
        symptomAnswers: Object.keys(formData.symptomAnswers).length > 0 ? formData.symptomAnswers : null,
        riskFactors: Object.keys(formData.riskFactors).length > 0 ? formData.riskFactors : null,
        intakeSource: isKioskMode ? IntakeSource.KIOSK : IntakeSource.MOBILE,
      }

      // Validate required fields before submission
      if (!payload.firstName) {
        throw new Error('First name is required')
      }
      // API requires lastName for MOBILE and KIOSK modes
      if (!payload.lastName) {
        throw new Error('Last name is required')
      }
      if (!payload.dob) {
        throw new Error('Date of birth is required')
      }
      if (!payload.sex) {
        throw new Error('Sex is required')
      }

      const response = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to submit intake. Please try again.'
        try {
          const error = await response.json()
          console.error('Intake submission error response:', error)
          
          // Show validation details if available
          if (error.details && Array.isArray(error.details)) {
            const errorMessages = error.details.map((d: any) => {
              const fieldLabel = d.field === 'lastName' ? 'Last name' :
                                d.field === 'dob' ? 'Date of birth' :
                                d.field === 'sex' ? 'Sex' :
                                d.field
              return `${fieldLabel}: ${d.message}`
            }).join('\n')
            errorMessage = (error.error || 'Validation failed') + ':\n' + errorMessages
          } else if (error.error) {
            errorMessage = error.error
          }
        } catch (e) {
          // If response is not JSON, use status text
          console.error('Failed to parse error response:', e)
          errorMessage = `Failed to submit intake (${response.status}: ${response.statusText}). Please check your connection and try again.`
        }
        console.error('Intake submission error:', errorMessage)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      const visitId = result.visitId || result.id || result.visit?.id

      // Submit insurance information if provided (after visit is created)
      if (visitId && formData.insuranceStatus) {
        try {
          const insurancePayload: any = {
            insuranceStatus: formData.insuranceStatus,
            insuranceCarrierName: formData.insuranceCarrierName || null,
            planName: formData.planName || null,
            policyId: formData.policyId || null,
            groupNumber: formData.groupNumber || null,
            planType: formData.planType || null,
            subscriberIsPatient: formData.subscriberIsPatient,
            subscriberFullName: formData.subscriberIsPatient ? null : (formData.subscriberFullName || null),
            subscriberDOB: formData.subscriberIsPatient ? null : (formData.subscriberDOB ? new Date(formData.subscriberDOB).toISOString() : null),
            subscriberRelationshipToPatient: formData.subscriberIsPatient ? null : (formData.subscriberRelationshipToPatient || null),
            subscriberEmployerName: formData.subscriberEmployerName || null,
            guarantorIsSubscriber: formData.guarantorIsSubscriber,
            guarantorFullName: formData.guarantorIsSubscriber ? null : (formData.guarantorFullName || null),
            guarantorRelationshipToPatient: formData.guarantorIsSubscriber ? null : (formData.guarantorRelationshipToPatient || null),
            guarantorAddressLine1: formData.guarantorIsSubscriber ? null : (formData.guarantorAddressLine1 || null),
            guarantorAddressLine2: formData.guarantorIsSubscriber ? null : (formData.guarantorAddressLine2 || null),
            guarantorCity: formData.guarantorIsSubscriber ? null : (formData.guarantorCity || null),
            guarantorState: formData.guarantorIsSubscriber ? null : (formData.guarantorState || null),
            guarantorZip: formData.guarantorIsSubscriber ? null : (formData.guarantorZip || null),
            guarantorPhoneNumber: formData.guarantorIsSubscriber ? null : (formData.guarantorPhoneNumber || null),
            cardFrontImageUrl: formData.cardFrontImageUrl || null,
            cardBackImageUrl: formData.cardBackImageUrl || null,
            wantsFinancialAssistance: formData.wantsFinancialAssistance || false,
          }

          const insuranceResponse = await fetch(`/api/visits/${visitId}/insurance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(insurancePayload),
          })

          if (!insuranceResponse.ok) {
            const insuranceError = await insuranceResponse.json()
            console.error('Insurance submission error:', insuranceError)
            // Don't fail the entire submission if insurance fails
          }
        } catch (insuranceError) {
          console.error('Error submitting insurance:', insuranceError)
          // Don't fail the entire submission if insurance fails
        }
      }

      setSubmitSuccess(true)

      // In demo mode, redirect to nurse console
      if (tourActive) {
        setTimeout(() => {
          router.push('/staff/dashboard?demo=complete')
        }, 2000)
      } else {
        // Normal redirect after 3 seconds
        setTimeout(() => {
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

  const handleFileUpload = (field: 'idDocumentImage', file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }))
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
    <>
      <DemoGuide />
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
        <h1 className={styles.pageTitle} data-tour-id="form-intro">{t.pageTitle}</h1>

        {/* Step 1: Demographics */}
        {currentStep === 'demographics' && (
          <div className={styles.stepContent} data-tour-id="form-demographics">
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

        {/* Step 2: Registration (ID Documents) */}
        {currentStep === 'registration' && (
          <div className={styles.stepContent}>
            <h2>{language === 'es' ? 'Identificación' : 'Identification'}</h2>
            <p className={styles.stepDescription}>
              {language === 'es'
                ? 'Proporcione información de identificación (opcional)'
                : 'Please provide identification information (optional)'}
            </p>

            {/* ID Document */}
            <div className={styles.formSection}>
              <div className={styles.formGroup}>
                <label htmlFor="idDocumentType">
                  {language === 'es' ? 'Tipo de Identificación' : 'ID Type'}
                </label>
                <select
                  id="idDocumentType"
                  value={formData.idDocumentType}
                  onChange={(e) => updateFormData('idDocumentType', e.target.value)}
                  className={`${isKioskMode ? styles.kioskInput : ''} ${
                    accessibilityMode ? styles.accessibilityInput : ''
                  }`}
                >
                  <option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>
                  <option value="DRIVERS_LICENSE">
                    {language === 'es' ? 'Licencia de Conducir' : 'Driver\'s License'}
                  </option>
                  <option value="STATE_ID">
                    {language === 'es' ? 'ID Estatal' : 'State ID'}
                  </option>
                  <option value="PASSPORT">
                    {language === 'es' ? 'Pasaporte' : 'Passport'}
                  </option>
                  <option value="OTHER">
                    {language === 'es' ? 'Otro' : 'Other'}
                  </option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="idDocumentImage">
                  {language === 'es' ? 'Foto de Identificación' : 'ID Photo'}
                </label>
                <input
                  id="idDocumentImage"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    handleFileUpload('idDocumentImage', file)
                  }}
                  className={`${isKioskMode ? styles.kioskInput : ''} ${
                    accessibilityMode ? styles.accessibilityInput : ''
                  }`}
                />
                {formData.idDocumentImage && (
                  <div className={styles.filePreview}>
                    {language === 'es' ? 'Archivo seleccionado:' : 'File selected:'} {formData.idDocumentImage.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Insurance & Billing */}
        {currentStep === 'insurance' && (
          <div className={styles.stepContent}>
            <h2>{language === 'es' ? 'Seguro y Facturación' : 'Insurance & Billing'}</h2>
            <p className={styles.stepDescription}>
              {language === 'es'
                ? 'Proporcione información de seguro (opcional)'
                : 'Please provide insurance information (optional)'}
            </p>

            {/* Primary Selection */}
            <div className={styles.formSection}>
              <h3>{language === 'es' ? '¿Tiene seguro médico?' : 'Do you have health insurance?'}</h3>
              <div className={styles.insuranceOptions}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="insuranceStatus"
                    value="HAS_INSURANCE"
                    checked={formData.insuranceStatus === 'HAS_INSURANCE'}
                    onChange={(e) => updateFormData('insuranceStatus', e.target.value)}
                  />
                  <span>{language === 'es' ? 'Tengo seguro médico' : 'I have health insurance'}</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="insuranceStatus"
                    value="SELF_PAY"
                    checked={formData.insuranceStatus === 'SELF_PAY'}
                    onChange={(e) => updateFormData('insuranceStatus', e.target.value)}
                  />
                  <span>{language === 'es' ? 'No tengo seguro / Pagaré yo mismo' : 'I don\'t have insurance / I will self-pay'}</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="insuranceStatus"
                    value="UNKNOWN"
                    checked={formData.insuranceStatus === 'UNKNOWN'}
                    onChange={(e) => updateFormData('insuranceStatus', e.target.value)}
                  />
                  <span>{language === 'es' ? 'No estoy seguro / No tengo mi tarjeta' : 'I\'m not sure / I don\'t have my card with me'}</span>
                </label>
              </div>
            </div>

            {/* Insurance Form - Show if HAS_INSURANCE */}
            {formData.insuranceStatus === 'HAS_INSURANCE' && (
              <>
                {/* Card Upload */}
                <div className={styles.formSection}>
                  <h3>{language === 'es' ? 'Foto de Tarjeta de Seguro' : 'Insurance Card Photo'}</h3>
                  <div className={styles.formGroup}>
                    <label htmlFor="cardFrontImage">
                      {language === 'es' ? 'Frente de la Tarjeta' : 'Front of Card'} *
                    </label>
                    <input
                      id="cardFrontImage"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file) {
                          // In production, upload to storage and get URL
                          // For now, store file reference
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            updateFormData('cardFrontImageUrl', reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className={`${isKioskMode ? styles.kioskInput : ''} ${
                        accessibilityMode ? styles.accessibilityInput : ''
                      }`}
                    />
                    {formData.cardFrontImageUrl && (
                      <div className={styles.filePreview}>
                        {language === 'es' ? 'Imagen cargada' : 'Image uploaded'}
                      </div>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="cardBackImage">
                      {language === 'es' ? 'Reverso de la Tarjeta' : 'Back of Card'} ({language === 'es' ? 'Opcional' : 'Optional'})
                    </label>
                    <input
                      id="cardBackImage"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            updateFormData('cardBackImageUrl', reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className={`${isKioskMode ? styles.kioskInput : ''} ${
                        accessibilityMode ? styles.accessibilityInput : ''
                      }`}
                    />
                    {formData.cardBackImageUrl && (
                      <div className={styles.filePreview}>
                        {language === 'es' ? 'Imagen cargada' : 'Image uploaded'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Plan Details */}
                <div className={styles.formSection}>
                  <h3>{language === 'es' ? 'Detalles del Plan' : 'Plan Details'}</h3>
                  <div className={styles.formGroup}>
                    <label htmlFor="insuranceCarrierName">
                      {language === 'es' ? 'Compañía de Seguro' : 'Insurance Carrier'} *
                    </label>
                    <input
                      id="insuranceCarrierName"
                      type="text"
                      value={formData.insuranceCarrierName}
                      onChange={(e) => updateFormData('insuranceCarrierName', e.target.value)}
                      placeholder={language === 'es' ? 'Ej: Blue Cross Blue Shield' : 'e.g., Blue Cross Blue Shield'}
                      className={`${isKioskMode ? styles.kioskInput : ''} ${
                        accessibilityMode ? styles.accessibilityInput : ''
                      }`}
                      required={formData.insuranceStatus === 'HAS_INSURANCE'}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="planName">
                      {language === 'es' ? 'Nombre del Plan' : 'Plan Name'} ({language === 'es' ? 'Opcional' : 'Optional'})
                    </label>
                    <input
                      id="planName"
                      type="text"
                      value={formData.planName}
                      onChange={(e) => updateFormData('planName', e.target.value)}
                      className={`${isKioskMode ? styles.kioskInput : ''} ${
                        accessibilityMode ? styles.accessibilityInput : ''
                      }`}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="policyId">
                      {language === 'es' ? 'ID de Miembro / Número de Póliza' : 'Member ID / Policy Number'} *
                    </label>
                    <input
                      id="policyId"
                      type="text"
                      value={formData.policyId}
                      onChange={(e) => updateFormData('policyId', e.target.value)}
                      className={`${isKioskMode ? styles.kioskInput : ''} ${
                        accessibilityMode ? styles.accessibilityInput : ''
                      }`}
                      required={formData.insuranceStatus === 'HAS_INSURANCE'}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="groupNumber">
                      {language === 'es' ? 'Número de Grupo' : 'Group Number'} ({language === 'es' ? 'Recomendado' : 'Recommended'})
                    </label>
                    <input
                      id="groupNumber"
                      type="text"
                      value={formData.groupNumber}
                      onChange={(e) => updateFormData('groupNumber', e.target.value)}
                      className={`${isKioskMode ? styles.kioskInput : ''} ${
                        accessibilityMode ? styles.accessibilityInput : ''
                      }`}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="planType">
                      {language === 'es' ? 'Tipo de Plan' : 'Plan Type'}
                    </label>
                    <select
                      id="planType"
                      value={formData.planType}
                      onChange={(e) => updateFormData('planType', e.target.value)}
                      className={`${isKioskMode ? styles.kioskInput : ''} ${
                        accessibilityMode ? styles.accessibilityInput : ''
                      }`}
                    >
                      <option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>
                      <option value="PPO">PPO</option>
                      <option value="HMO">HMO</option>
                      <option value="EPO">EPO</option>
                      <option value="POS">POS</option>
                      <option value="MEDICARE">{language === 'es' ? 'Medicare' : 'Medicare'}</option>
                      <option value="MEDICAID">{language === 'es' ? 'Medicaid' : 'Medicaid'}</option>
                      <option value="TRICARE">{language === 'es' ? 'Tricare' : 'Tricare'}</option>
                      <option value="OTHER">{language === 'es' ? 'Otro' : 'Other'}</option>
                    </select>
                  </div>
                </div>

                {/* Subscriber Information */}
                <div className={styles.formSection}>
                  <h3>{language === 'es' ? 'Información del Suscriptor' : 'Subscriber Information'}</h3>
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxOption}>
                      <input
                        type="checkbox"
                        checked={formData.subscriberIsPatient}
                        onChange={(e) => {
                          updateFormData('subscriberIsPatient', e.target.checked)
                          if (e.target.checked) {
                            updateFormData('subscriberFullName', `${formData.firstName} ${formData.lastName}`)
                            updateFormData('subscriberDOB', formData.dob)
                            updateFormData('subscriberRelationshipToPatient', 'SELF')
                          }
                        }}
                      />
                      <span>{language === 'es' ? 'Yo soy la persona cuyo nombre está en la tarjeta' : 'I am the person whose name is on the card'}</span>
                    </label>
                  </div>

                  {!formData.subscriberIsPatient && (
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="subscriberFullName">
                          {language === 'es' ? 'Nombre Completo del Suscriptor' : 'Subscriber Full Name'} *
                        </label>
                        <input
                          id="subscriberFullName"
                          type="text"
                          value={formData.subscriberFullName}
                          onChange={(e) => updateFormData('subscriberFullName', e.target.value)}
                          className={`${isKioskMode ? styles.kioskInput : ''} ${
                            accessibilityMode ? styles.accessibilityInput : ''
                          }`}
                          required={!formData.subscriberIsPatient}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subscriberDOB">
                          {language === 'es' ? 'Fecha de Nacimiento del Suscriptor' : 'Subscriber Date of Birth'} *
                        </label>
                        <input
                          id="subscriberDOB"
                          type="date"
                          value={formData.subscriberDOB}
                          onChange={(e) => updateFormData('subscriberDOB', e.target.value)}
                          className={`${isKioskMode ? styles.kioskInput : ''} ${
                            accessibilityMode ? styles.accessibilityInput : ''
                          }`}
                          required={!formData.subscriberIsPatient}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subscriberRelationshipToPatient">
                          {language === 'es' ? 'Relación con el Paciente' : 'Relationship to Patient'} *
                        </label>
                        <select
                          id="subscriberRelationshipToPatient"
                          value={formData.subscriberRelationshipToPatient}
                          onChange={(e) => updateFormData('subscriberRelationshipToPatient', e.target.value)}
                          className={`${isKioskMode ? styles.kioskInput : ''} ${
                            accessibilityMode ? styles.accessibilityInput : ''
                          }`}
                          required={!formData.subscriberIsPatient}
                        >
                          <option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>
                          <option value="PARENT">{language === 'es' ? 'Padre/Madre' : 'Parent'}</option>
                          <option value="SPOUSE">{language === 'es' ? 'Cónyuge' : 'Spouse'}</option>
                          <option value="CHILD">{language === 'es' ? 'Hijo/Hija' : 'Child'}</option>
                          <option value="OTHER">{language === 'es' ? 'Otro' : 'Other'}</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subscriberEmployerName">
                          {language === 'es' ? 'Empleador del Suscriptor' : 'Subscriber Employer'} ({language === 'es' ? 'Opcional' : 'Optional'})
                        </label>
                        <input
                          id="subscriberEmployerName"
                          type="text"
                          value={formData.subscriberEmployerName}
                          onChange={(e) => updateFormData('subscriberEmployerName', e.target.value)}
                          className={`${isKioskMode ? styles.kioskInput : ''} ${
                            accessibilityMode ? styles.accessibilityInput : ''
                          }`}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Guarantor Information */}
                <div className={styles.formSection}>
                  <h3>{language === 'es' ? 'Garante' : 'Guarantor'}</h3>
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxOption}>
                      <input
                        type="checkbox"
                        checked={formData.guarantorIsSubscriber}
                        onChange={(e) => updateFormData('guarantorIsSubscriber', e.target.checked)}
                      />
                      <span>{language === 'es' ? 'La persona en la tarjeta es financieramente responsable (garante)' : 'The person on the card is financially responsible (guarantor)'}</span>
                    </label>
                  </div>

                  {!formData.guarantorIsSubscriber && (
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="guarantorFullName">
                          {language === 'es' ? 'Nombre Completo del Garante' : 'Guarantor Full Name'} *
                        </label>
                        <input
                          id="guarantorFullName"
                          type="text"
                          value={formData.guarantorFullName}
                          onChange={(e) => updateFormData('guarantorFullName', e.target.value)}
                          className={`${isKioskMode ? styles.kioskInput : ''} ${
                            accessibilityMode ? styles.accessibilityInput : ''
                          }`}
                          required={!formData.guarantorIsSubscriber}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="guarantorRelationshipToPatient">
                          {language === 'es' ? 'Relación con el Paciente' : 'Relationship to Patient'} *
                        </label>
                        <select
                          id="guarantorRelationshipToPatient"
                          value={formData.guarantorRelationshipToPatient}
                          onChange={(e) => updateFormData('guarantorRelationshipToPatient', e.target.value)}
                          className={`${isKioskMode ? styles.kioskInput : ''} ${
                            accessibilityMode ? styles.accessibilityInput : ''
                          }`}
                          required={!formData.guarantorIsSubscriber}
                        >
                          <option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>
                          <option value="SELF">{language === 'es' ? 'Yo mismo' : 'Self'}</option>
                          <option value="PARENT">{language === 'es' ? 'Padre/Madre' : 'Parent'}</option>
                          <option value="SPOUSE">{language === 'es' ? 'Cónyuge' : 'Spouse'}</option>
                          <option value="CHILD">{language === 'es' ? 'Hijo/Hija' : 'Child'}</option>
                          <option value="OTHER">{language === 'es' ? 'Otro' : 'Other'}</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="guarantorAddressLine1">
                          {language === 'es' ? 'Dirección del Garante' : 'Guarantor Address'} *
                        </label>
                        <input
                          id="guarantorAddressLine1"
                          type="text"
                          value={formData.guarantorAddressLine1}
                          onChange={(e) => updateFormData('guarantorAddressLine1', e.target.value)}
                          className={`${isKioskMode ? styles.kioskInput : ''} ${
                            accessibilityMode ? styles.accessibilityInput : ''
                          }`}
                          required={!formData.guarantorIsSubscriber}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor="guarantorCity">
                            {language === 'es' ? 'Ciudad' : 'City'} *
                          </label>
                          <input
                            id="guarantorCity"
                            type="text"
                            value={formData.guarantorCity}
                            onChange={(e) => updateFormData('guarantorCity', e.target.value)}
                            className={`${isKioskMode ? styles.kioskInput : ''} ${
                              accessibilityMode ? styles.accessibilityInput : ''
                            }`}
                            required={!formData.guarantorIsSubscriber}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label htmlFor="guarantorState">
                            {language === 'es' ? 'Estado' : 'State'} *
                          </label>
                          <input
                            id="guarantorState"
                            type="text"
                            value={formData.guarantorState}
                            onChange={(e) => updateFormData('guarantorState', e.target.value)}
                            className={`${isKioskMode ? styles.kioskInput : ''} ${
                              accessibilityMode ? styles.accessibilityInput : ''
                            }`}
                            required={!formData.guarantorIsSubscriber}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label htmlFor="guarantorZip">
                            {language === 'es' ? 'Código Postal' : 'Zip Code'} *
                          </label>
                          <input
                            id="guarantorZip"
                            type="text"
                            value={formData.guarantorZip}
                            onChange={(e) => updateFormData('guarantorZip', e.target.value)}
                            className={`${isKioskMode ? styles.kioskInput : ''} ${
                              accessibilityMode ? styles.accessibilityInput : ''
                            }`}
                            required={!formData.guarantorIsSubscriber}
                          />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="guarantorPhoneNumber">
                          {language === 'es' ? 'Teléfono del Garante' : 'Guarantor Phone'} *
                        </label>
                        <input
                          id="guarantorPhoneNumber"
                          type="tel"
                          value={formData.guarantorPhoneNumber}
                          onChange={(e) => updateFormData('guarantorPhoneNumber', e.target.value)}
                          className={`${isKioskMode ? styles.kioskInput : ''} ${
                            accessibilityMode ? styles.accessibilityInput : ''
                          }`}
                          required={!formData.guarantorIsSubscriber}
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Self-Pay Message */}
            {formData.insuranceStatus === 'SELF_PAY' && (
              <div className={styles.formSection}>
                <div className={styles.infoMessage}>
                  <p>
                    {language === 'es'
                      ? 'Aún puede ser tratado. Un representante de facturación puede contactarlo más tarde para discutir opciones de pago.'
                      : 'You can still be treated. A billing representative may contact you later to discuss payment options.'}
                  </p>
                  <label className={styles.checkboxOption}>
                    <input
                      type="checkbox"
                      checked={formData.wantsFinancialAssistance}
                      onChange={(e) => updateFormData('wantsFinancialAssistance', e.target.checked)}
                    />
                    <span>
                      {language === 'es'
                        ? '¿Le gustaría que verifiquemos si califica para asistencia financiera?'
                        : 'Would you like us to check if you qualify for financial assistance?'}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Unknown/Not Sure Message */}
            {formData.insuranceStatus === 'UNKNOWN' && (
              <div className={styles.formSection}>
                <div className={styles.infoMessage}>
                  <p>
                    {language === 'es'
                      ? 'El personal de registro lo ayudará cuando llegue. Es posible que se le solicite proporcionar su tarjeta o más información.'
                      : 'Registration staff will help you when you arrive. You may be asked to provide your card or more information.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Chief Complaint */}
        {currentStep === 'complaint' && (
          <div className={styles.stepContent} data-tour-id="form-complaint">
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

        {/* Step 4: Symptom Questions - Dynamic Chip/Slide System */}
        {currentStep === 'symptoms' && (
          <div className={styles.stepContent} data-tour-id="form-symptoms">
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

        {/* Step 5: Review */}
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
                (currentStep === 'demographics' && !canProceedToRegistration()) ||
                (currentStep === 'registration' && !canProceedToComplaint()) ||
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
                if (tourStep === 'form-submit') {
                  setTimeout(() => {
                    tourNextStep()
                  }, 1000)
                }
              }}
              disabled={isSubmitting}
              data-tour-id="form-submit"
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
    </>
  )
}

