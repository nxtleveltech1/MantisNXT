/**
 * JWT Secret Validation Module
 * Centralized validation to enforce JWT_SECRET environment variable
 * Phase A.1: Security hardening - removed hardcoded fallbacks
 */

/**
 * Get and validate JWT secret from environment
 * @throws {Error} If JWT_SECRET environment variable is not set
 * @returns {string} Validated JWT secret
 */
export function getValidatedJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'SECURITY ERROR: JWT_SECRET environment variable is required but not set. ' +
      'Please configure JWT_SECRET in your environment variables before starting the application. ' +
      'Generate a secure secret using: openssl rand -base64 32'
    );
  }

  // Minimum security requirement: at least 32 characters
  if (secret.length < 32) {
    throw new Error(
      'SECURITY ERROR: JWT_SECRET must be at least 32 characters long for secure token generation. ' +
      'Current length: ' + secret.length + '. ' +
      'Generate a secure secret using: openssl rand -base64 32'
    );
  }

  return secret;
}

/**
 * Validate JWT secret on module initialization
 * This ensures the application fails fast if JWT_SECRET is misconfigured
 */
export function validateJwtSecretOnStartup(): void {
  try {
    getValidatedJwtSecret();
    console.log('✅ JWT_SECRET validation passed');
  } catch (error) {
    console.error('❌ JWT_SECRET validation failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Check if JWT secret is properly configured (non-throwing version)
 * @returns {boolean} True if JWT_SECRET is properly configured
 */
export function isJwtSecretConfigured(): boolean {
  try {
    getValidatedJwtSecret();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get JWT secret configuration status for health checks
 * @returns {object} Configuration status information
 */
export function getJwtSecretStatus(): {
  configured: boolean;
  length?: number;
  meetsMinimumRequirement?: boolean;
  error?: string;
} {
  try {
    const secret = getValidatedJwtSecret();
    return {
      configured: true,
      length: secret.length,
      meetsMinimumRequirement: secret.length >= 32
    };
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
