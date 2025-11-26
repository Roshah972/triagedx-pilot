/**
 * Secure error handling utilities
 * Prevents PHI leakage in error messages
 */

/**
 * Sanitize error object to remove PHI
 * 
 * @param error - Error object to sanitize
 * @returns Sanitized error information
 */
export function sanitizeError(error: unknown): {
  name: string
  message: string
  stack?: string
} {
  if (error instanceof Error) {
    // Remove potential PHI from error messages
    let message = error.message
    // Remove common PHI patterns (names, dates, IDs)
    message = message.replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, '[REDACTED]') // Names
    message = message.replace(/\d{4}-\d{2}-\d{2}/g, '[REDACTED]') // Dates
    message = message.replace(/[a-z0-9]{20,}/gi, '[REDACTED]') // Long IDs
    
    return {
      name: error.name,
      message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Limit stack trace
    }
  }
  
  return {
    name: 'UnknownError',
    message: 'An unknown error occurred',
  }
}

/**
 * Create a safe error response for API routes
 * 
 * @param error - Error object
 * @param defaultMessage - Default error message to return to client
 * @returns NextResponse with error
 */
export function createErrorResponse(error: unknown, defaultMessage: string) {
  const sanitized = sanitizeError(error)
  
  // Log sanitized error (in production, use proper logging service)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', sanitized)
  }
  
  // Return generic error to client (never expose PHI or stack traces)
  return {
    error: defaultMessage,
  }
}

