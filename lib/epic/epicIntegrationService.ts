import { PatientProfile, Visit, IntakeForm, EwsAssessment, Vitals } from '@prisma/client'

/**
 * EPIC Patient ID returned after syncing a patient profile
 */
export type EpicPatientId = string

/**
 * EPIC Encounter ID returned after syncing a visit
 */
export type EpicEncounterId = string

/**
 * Extended types with relations for EPIC sync
 */
export type PatientProfileWithRelations = PatientProfile & {
  insuranceProfiles?: Array<{ providerName: string | null; memberId: string | null; groupId: string | null }>
  idDocuments?: Array<{ docType: string; imageUrl: string }>
}

export type VisitWithRelations = Visit & {
  patientProfile: PatientProfileWithRelations
  intakeForm: IntakeForm | null
  ewsAssessments: EwsAssessment[]
  vitals: Vitals[]
}

/**
 * EPIC Integration Service
 * 
 * Abstracts EPIC FHIR API interactions. Maps internal data models to FHIR resources
 * and handles patient/encounter synchronization.
 * 
 * This is a stub implementation. In production, this would:
 * - Authenticate with EPIC OAuth2
 * - Map Prisma models to FHIR resources (Patient, Encounter, Observation, Coverage)
 * - Handle FHIR API calls with proper error handling and retries
 * - Support both create and update operations
 */
export class EpicIntegrationService {
  private baseUrl: string
  private accessToken: string | null

  constructor() {
    this.baseUrl = process.env.EPIC_FHIR_BASE_URL || ''
    this.accessToken = process.env.EPIC_ACCESS_TOKEN || null
  }

  /**
   * Syncs a patient profile to EPIC and returns the EPIC patient ID.
   * 
   * Maps PatientProfile to FHIR Patient resource and creates/updates in EPIC.
   * Also syncs insurance (Coverage) and ID documents if available.
   * 
   * @param patientProfile - Patient profile with optional insurance and ID documents
   * @returns EPIC patient ID (MRN)
   * @throws Error if sync fails
   */
  async syncPatientProfile(
    patientProfile: PatientProfileWithRelations
  ): Promise<EpicPatientId> {
    // TODO: Implement EPIC patient sync
    // 
    // Steps:
    // 1. Check if patient already exists in EPIC (search by MRN or demographics)
    // 2. Map PatientProfile to FHIR Patient resource
    // 3. Create or update patient in EPIC via FHIR API
    // 4. If insurance profiles exist, create FHIR Coverage resources
    // 5. Store returned EPIC patient ID in PatientProfile.epicPatientId
    // 6. Handle errors (duplicate patient, validation errors, etc.)

    if (!this.baseUrl) {
      throw new Error('EPIC_FHIR_BASE_URL not configured')
    }

    // Stub: Return mock EPIC patient ID
    // In production, this would make actual FHIR API calls
    const mockEpicPatientId = `EPIC-${patientProfile.id.slice(0, 8)}`
    
    console.log(`[EPIC] Syncing patient profile: ${patientProfile.id} -> ${mockEpicPatientId}`)
    
    return mockEpicPatientId
  }

  /**
   * Syncs a visit (encounter) to EPIC with intake data, EWS, and vitals.
   * 
   * Maps Visit to FHIR Encounter, IntakeForm to Condition/Observation,
   * EwsAssessment to Observation, and Vitals to Observation resources.
   * 
   * @param visit - Visit with all related data (patient, intake, EWS, vitals)
   * @returns EPIC encounter ID
   * @throws Error if sync fails
   */
  async syncVisit(visit: VisitWithRelations): Promise<EpicEncounterId> {
    // TODO: Implement EPIC visit/encounter sync
    // 
    // Steps:
    // 1. Ensure patient is synced first (call syncPatientProfile if needed)
    // 2. Map Visit to FHIR Encounter resource
    // 3. Map IntakeForm.chiefComplaint to FHIR Condition or Observation
    // 4. Map EwsAssessment to FHIR Observation (code for EWS)
    // 5. Map Vitals to FHIR Observation resources (vital signs)
    // 6. Create encounter in EPIC via FHIR API
    // 7. Link all observations to the encounter
    // 8. Store returned EPIC encounter ID in Visit.epicEncounterId
    // 9. Handle errors and retries

    if (!this.baseUrl) {
      throw new Error('EPIC_FHIR_BASE_URL not configured')
    }

    // Stub: Return mock EPIC encounter ID
    const mockEpicEncounterId = `ENC-${visit.id.slice(0, 8)}`
    
    console.log(`[EPIC] Syncing visit: ${visit.id} -> ${mockEpicEncounterId}`)
    
    return mockEpicEncounterId
  }

  /**
   * Checks if a patient profile has been synced to EPIC.
   * 
   * @param patientProfile - Patient profile to check
   * @returns true if patient has an EPIC patient ID
   */
  isPatientSynced(patientProfile: PatientProfile): boolean {
    return patientProfile.epicPatientId !== null && patientProfile.epicPatientId !== undefined
  }

  /**
   * Checks if a visit has been synced to EPIC.
   * 
   * @param visit - Visit to check
   * @returns true if visit has an EPIC encounter ID
   */
  isVisitSynced(visit: Visit): boolean {
    return visit.epicEncounterId !== null && visit.epicEncounterId !== undefined
  }

  /**
   * Authenticates with EPIC OAuth2 and retrieves an access token.
   * 
   * This should be called before making FHIR API requests if using OAuth2.
   * 
   * @returns Access token for EPIC FHIR API
   */
  async authenticate(): Promise<string> {
    // TODO: Implement EPIC OAuth2 authentication
    // 
    // Steps:
    // 1. Exchange client credentials for access token
    // 2. Store token (with expiration) for reuse
    // 3. Handle token refresh if expired
    // 4. Return access token

    if (!this.accessToken) {
      throw new Error('EPIC_ACCESS_TOKEN not configured. OAuth2 authentication not yet implemented.')
    }

    return this.accessToken
  }
}

/**
 * Singleton instance of EPIC Integration Service
 */
export const epicIntegrationService = new EpicIntegrationService()

