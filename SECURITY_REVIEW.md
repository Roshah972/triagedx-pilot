# Security & Privacy Review - TRIAGEDX

**Date**: 2024  
**Scope**: PHI (Protected Health Information) handling, security vulnerabilities, and privacy concerns  
**Status**: Recommendations for implementation

---

## Executive Summary

This document identifies security and privacy issues related to PHI handling in the TRIAGEDX application. All findings are categorized by severity and include concrete recommendations for remediation.

---

## 1. Critical Issues

### 1.1 Missing Authentication/Authorization on API Routes

**Issue**: All API routes are publicly accessible without authentication or authorization checks. Any user can access patient data, modify visits, record vitals, and sync to EPIC.

**Affected Routes**:
- `/api/intake/submit` - Public (acceptable for patient self-check-in)
- `/api/visits/[visitId]` - **CRITICAL**: Exposes full patient profile, insurance, ID documents
- `/api/vitals/record` - **CRITICAL**: Allows recording vitals without staff verification
- `/api/waiting-room` - **CRITICAL**: Exposes all waiting room patient data
- `/api/visits/[visitId]/epic` - **CRITICAL**: Allows EPIC sync without authorization

**Risk**: Unauthorized access to PHI, data manipulation, HIPAA violations

**Recommendation**:
```typescript
// Create middleware for authentication/authorization
// app/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth' // Implement JWT verification

export async function requireAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const user = await verifyToken(token)
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  
  return user
}

export async function requireRole(user: any, allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

**Implementation Steps**:
1. Add authentication middleware to all staff-facing API routes
2. Implement role-based access control (NURSE, REGISTRAR, ADMIN)
3. Keep `/api/intake/submit` public (for patient self-check-in)
4. Add rate limiting to public endpoints

---

### 1.2 PHI Leakage in Error Logs

**Issue**: `console.error()` statements throughout the codebase may log PHI (patient names, DOB, visit IDs) to application logs, which could be exposed in error monitoring systems (e.g., Sentry, CloudWatch).

**Affected Files**:
- `app/api/intake/submit/route.ts:357`
- `app/api/vitals/record/route.ts:142`
- `app/api/visits/[visitId]/route.ts:43, 97`
- `app/api/waiting-room/route.ts:213`
- `lib/epic/epicIntegrationService.ts:80, 116` (console.log with patient IDs)

**Example**:
```typescript
// CURRENT (INSECURE):
catch (error) {
  console.error('Error submitting intake:', error) // May contain PHI in error object
  return NextResponse.json({ error: 'Failed to submit intake' }, { status: 500 })
}
```

**Risk**: PHI exposure in logs, HIPAA violations, compliance issues

**Recommendation**:
```typescript
// Create secure logging utility
// lib/utils/secureLogger.ts
import { sanitizeError } from './errorSanitizer'

export function logError(message: string, error: unknown, context?: Record<string, any>) {
  // Sanitize error to remove PHI
  const sanitizedError = sanitizeError(error)
  const sanitizedContext = sanitizeContext(context)
  
  // Use structured logging (e.g., Winston, Pino)
  logger.error({
    message,
    error: sanitizedError,
    context: sanitizedContext,
    timestamp: new Date().toISOString(),
  })
}

function sanitizeError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message.replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, '[REDACTED]'), // Remove names
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Limit stack trace
    }
  }
  return { error: 'Unknown error' }
}

function sanitizeContext(context?: Record<string, any>): Record<string, any> {
  if (!context) return {}
  
  const sanitized: Record<string, any> = {}
  const phiFields = ['firstName', 'lastName', 'dob', 'phone', 'email', 'addressLine1', 'patientId', 'visitId']
  
  for (const [key, value] of Object.entries(context)) {
    if (phiFields.includes(key)) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}
```

**Implementation Steps**:
1. Replace all `console.error()` calls with secure logging utility
2. Implement error sanitization to remove PHI
3. Configure log retention policies (HIPAA requires audit logs but with PHI protection)
4. Use structured logging library (Winston, Pino) with PHI filtering

---

### 1.3 Unvalidated Image Storage

**Issue**: The schema stores `imageUrl` and `rawImageUrl` for ID documents and insurance cards, but there's no validation of:
- File type (could be malicious files)
- File size (could cause DoS)
- Image content (could contain malware)
- URL security (could be external URLs exposing PHI)

**Affected Models**:
- `IdDocument.imageUrl`
- `InsuranceProfile.rawImageUrl`

**Risk**: Malware uploads, PHI exposure via unsecured URLs, storage abuse

**Recommendation**:
```typescript
// Add image validation service
// lib/services/imageValidation.ts
import { z } from 'zod'

const ImageUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Invalid file' }),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/pdf']),
})

export async function validateImageUpload(
  file: File,
  options?: { maxSize?: number; allowedTypes?: string[] }
): Promise<{ valid: boolean; error?: string }> {
  // Check file type
  const allowedTypes = options?.allowedTypes || ['image/jpeg', 'image/png', 'image/pdf']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` }
  }
  
  // Check file size
  const maxSize = options?.maxSize || 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` }
  }
  
  // TODO: Add malware scanning (e.g., ClamAV, AWS GuardDuty)
  // TODO: Validate image dimensions (prevent oversized images)
  // TODO: Strip EXIF metadata (may contain location data)
  
  return { valid: true }
}

// Store images in secure, private S3 bucket with signed URLs
// lib/services/storageService.ts
export async function uploadSecureImage(
  file: File,
  patientId: string,
  type: 'id' | 'insurance'
): Promise<string> {
  // Upload to private S3 bucket
  // Generate presigned URL for temporary access (expires in 1 hour)
  // Store only the S3 key, not full URL
  // Implement access control: only authorized staff can generate presigned URLs
}
```

**Implementation Steps**:
1. Add file type and size validation to image upload endpoints
2. Implement malware scanning (ClamAV or cloud service)
3. Store images in private S3 bucket with access control
4. Use presigned URLs for temporary access (expire after 1 hour)
5. Strip EXIF metadata from images
6. Add rate limiting to image upload endpoints

---

## 2. High Priority Issues

### 2.1 Missing Input Validation on Other API Routes

**Issue**: Only `/api/intake/submit` has Zod validation. Other routes accept unvalidated input, which could lead to:
- SQL injection (though Prisma helps prevent this)
- Data corruption
- Type errors
- XSS if data is rendered in frontend

**Affected Routes**:
- `/api/vitals/record` - No validation on vitals values (could accept negative heart rate, etc.)
- `/api/visits/[visitId]` (PATCH) - No validation on patient profile updates
- `/api/visits/quick-create` - No validation

**Recommendation**: Add Zod schemas to all API routes (similar to intake submit)

---

### 2.2 Database Encryption at Rest

**Issue**: No mention of database encryption at rest. PostgreSQL data files containing PHI should be encrypted.

**Recommendation**:
1. Enable PostgreSQL encryption at rest (TDE - Transparent Data Encryption)
2. Use encrypted database volumes (AWS RDS encryption, Azure SQL encryption)
3. Encrypt database backups
4. Document encryption key management

---

### 2.3 API Response Data Exposure

**Issue**: API responses may expose more PHI than necessary. For example:
- `/api/waiting-room` returns full DOB (should return age only)
- `/api/visits/[visitId]` returns all patient data including insurance member IDs

**Recommendation**:
```typescript
// Implement response sanitization
// Only return fields necessary for the operation
// Example: Waiting room doesn't need full DOB, just age
const sanitizedResponse = {
  ...patient,
  dob: undefined, // Remove DOB
  age: calculateAge(patient.dob), // Return age instead
}
```

---

### 2.4 Missing Audit Logging

**Issue**: No audit trail for PHI access. HIPAA requires logging of:
- Who accessed PHI
- When it was accessed
- What was accessed
- Why it was accessed (purpose)

**Recommendation**:
```typescript
// Create audit log service
// lib/services/auditLog.ts
export async function logPhiAccess(params: {
  userId: string
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE'
  resourceType: 'PatientProfile' | 'Visit' | 'Vitals' | 'IntakeForm'
  resourceId: string
  purpose: string
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      purpose: params.purpose,
      timestamp: new Date(),
      ipAddress: request.ip, // From request context
    },
  })
}
```

**Implementation Steps**:
1. Create `AuditLog` model in Prisma schema
2. Add audit logging to all PHI access points
3. Implement log retention policy (HIPAA: 6 years minimum)
4. Create audit log review dashboard for compliance

---

## 3. Medium Priority Issues

### 3.1 Missing Rate Limiting

**Issue**: No rate limiting on API endpoints, allowing:
- Brute force attacks
- DoS attacks
- Abuse of public endpoints

**Recommendation**: Implement rate limiting using:
- Next.js middleware with Upstash Redis
- Or API gateway (AWS API Gateway, Cloudflare)

---

### 3.2 Missing HTTPS Enforcement

**Issue**: No explicit HTTPS enforcement in code (though should be handled at infrastructure level).

**Recommendation**: Add HTTPS redirect middleware and HSTS headers.

---

### 3.3 EPIC Integration Security

**Issue**: EPIC integration service logs patient IDs to console and uses environment variables for tokens without validation.

**Recommendation**:
1. Remove console.log statements (use secure logger)
2. Validate EPIC credentials on startup
3. Implement token refresh logic
4. Add retry logic with exponential backoff
5. Encrypt EPIC credentials in environment variables

---

### 3.4 Missing Data Retention Policy

**Issue**: No policy for data retention/deletion. HIPAA requires:
- Minimum retention periods
- Secure deletion procedures
- Patient right to deletion (with exceptions)

**Recommendation**: Document and implement data retention policies.

---

## 4. Low Priority / Best Practices

### 4.1 Environment Variable Security

**Recommendation**: Use a secrets management service (AWS Secrets Manager, HashiCorp Vault) instead of plain environment variables.

### 4.2 Database Connection Security

**Recommendation**: Use connection pooling with SSL/TLS, implement connection string encryption.

### 4.3 Frontend PHI Handling

**Recommendation**: 
- Clear sensitive data from browser memory when not needed
- Implement session timeout
- Use secure cookies for authentication
- Implement Content Security Policy (CSP)

---

## 5. Compliance Checklist

- [ ] **HIPAA Compliance**
  - [ ] Implement authentication/authorization
  - [ ] Encrypt PHI at rest and in transit
  - [ ] Implement audit logging
  - [ ] Secure image storage
  - [ ] Remove PHI from error logs
  - [ ] Implement data retention policies
  - [ ] Business Associate Agreements (BAAs) for third-party services

- [ ] **Security Best Practices**
  - [ ] Input validation on all endpoints
  - [ ] Rate limiting
  - [ ] HTTPS enforcement
  - [ ] Regular security audits
  - [ ] Penetration testing
  - [ ] Security incident response plan

---

## 6. Implementation Priority

1. **Immediate (Week 1)**:
   - Add authentication/authorization to API routes
   - Replace console.error with secure logging
   - Add input validation to all API routes

2. **Short-term (Month 1)**:
   - Implement secure image storage
   - Add audit logging
   - Enable database encryption at rest

3. **Medium-term (Quarter 1)**:
   - Implement rate limiting
   - Add data retention policies
   - Security audit and penetration testing

---

## 7. References

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Note**: This review is based on static code analysis. A comprehensive security assessment should include:
- Dynamic application security testing (DAST)
- Penetration testing
- Infrastructure security review
- Third-party dependency audit

