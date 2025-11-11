/**
 * Authentication Configuration Module
 * Centralized configuration for authentication system
 * Phase A.1: Security hardening - enforces secure defaults
 */

import { getValidatedJwtSecret } from './jwt-secret';

/**
 * Get JWT secret (validates on access)
 */
export function getJwtSecret(): string {
  return getValidatedJwtSecret();
}

/**
 * Session timeout configuration
 * Default: 1 hour (3600000 milliseconds)
 */
export const SESSION_TIMEOUT = parseInt(
  process.env.SESSION_TIMEOUT || '3600000',
  10
);

/**
 * JWT token expiry configuration
 * Default: 1 hour
 */
export const JWT_TOKEN_EXPIRY = process.env.JWT_TOKEN_EXPIRY || '1h';

/**
 * Refresh token expiry configuration
 * Default: 30 days
 */
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

/**
 * Token refresh threshold (in milliseconds)
 * Default: 15 minutes before expiry
 */
export const TOKEN_REFRESH_THRESHOLD = parseInt(
  process.env.TOKEN_REFRESH_THRESHOLD || '900000',
  10
);

/**
 * Bcrypt hash rounds for password hashing
 * Default: 12 (secure but performant)
 */
export const BCRYPT_ROUNDS = parseInt(
  process.env.BCRYPT_ROUNDS || '12',
  10
);

/**
 * Session cleanup interval (in milliseconds)
 * Default: 1 hour
 */
export const SESSION_CLEANUP_INTERVAL = parseInt(
  process.env.SESSION_CLEANUP_INTERVAL || '3600000',
  10
);

/**
 * Maximum active sessions per user
 * Default: 5
 */
export const MAX_SESSIONS_PER_USER = parseInt(
  process.env.MAX_SESSIONS_PER_USER || '5',
  10
);

/**
 * Password minimum length requirement
 * Default: 8 characters
 */
export const PASSWORD_MIN_LENGTH = parseInt(
  process.env.PASSWORD_MIN_LENGTH || '8',
  10
);

/**
 * Failed login attempt limit before lockout
 * Default: 5 attempts
 */
export const MAX_FAILED_LOGIN_ATTEMPTS = parseInt(
  process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5',
  10
);

/**
 * Account lockout duration (in milliseconds)
 * Default: 15 minutes
 */
export const ACCOUNT_LOCKOUT_DURATION = parseInt(
  process.env.ACCOUNT_LOCKOUT_DURATION || '900000',
  10
);

/**
 * Remember me duration (in days)
 * Default: 30 days
 */
export const REMEMBER_ME_DURATION_DAYS = parseInt(
  process.env.REMEMBER_ME_DURATION_DAYS || '30',
  10
);

/**
 * Complete authentication configuration object
 */
export const AUTH_CONFIG = {
  jwt: {
    secret: getJwtSecret,
    tokenExpiry: JWT_TOKEN_EXPIRY,
    refreshTokenExpiry: REFRESH_TOKEN_EXPIRY,
    refreshThreshold: TOKEN_REFRESH_THRESHOLD
  },
  session: {
    timeout: SESSION_TIMEOUT,
    cleanupInterval: SESSION_CLEANUP_INTERVAL,
    maxSessionsPerUser: MAX_SESSIONS_PER_USER
  },
  password: {
    bcryptRounds: BCRYPT_ROUNDS,
    minLength: PASSWORD_MIN_LENGTH
  },
  security: {
    maxFailedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
    accountLockoutDuration: ACCOUNT_LOCKOUT_DURATION,
    rememberMeDuration: REMEMBER_ME_DURATION_DAYS
  }
} as const;

/**
 * Validate all authentication configuration on startup
 * @throws {Error} If any configuration is invalid
 */
export function validateAuthConfig(): void {
  // Validate JWT secret
  getValidatedJwtSecret();

  // Validate numeric configurations
  const numericConfigs = {
    'SESSION_TIMEOUT': SESSION_TIMEOUT,
    'TOKEN_REFRESH_THRESHOLD': TOKEN_REFRESH_THRESHOLD,
    'BCRYPT_ROUNDS': BCRYPT_ROUNDS,
    'SESSION_CLEANUP_INTERVAL': SESSION_CLEANUP_INTERVAL,
    'MAX_SESSIONS_PER_USER': MAX_SESSIONS_PER_USER,
    'PASSWORD_MIN_LENGTH': PASSWORD_MIN_LENGTH,
    'MAX_FAILED_LOGIN_ATTEMPTS': MAX_FAILED_LOGIN_ATTEMPTS,
    'ACCOUNT_LOCKOUT_DURATION': ACCOUNT_LOCKOUT_DURATION
  };

  for (const [key, value] of Object.entries(numericConfigs)) {
    if (isNaN(value) || value <= 0) {
      throw new Error(
        `Configuration error: ${key} must be a positive number. Current value: ${value}`
      );
    }
  }

  // Validate bcrypt rounds (should be between 10 and 15 for security/performance balance)
  if (BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 15) {
    console.warn(
      `⚠️  Warning: BCRYPT_ROUNDS is ${BCRYPT_ROUNDS}. Recommended range is 10-15 for security/performance balance.`
    );
  }

  // Validate password minimum length
  if (PASSWORD_MIN_LENGTH < 8) {
    throw new Error(
      `Security error: PASSWORD_MIN_LENGTH must be at least 8 characters. Current value: ${PASSWORD_MIN_LENGTH}`
    );
  }

  console.log('✅ Authentication configuration validated successfully');
}

/**
 * Get authentication configuration status for health checks
 */
export function getAuthConfigStatus(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: Record<string, unknown>;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    validateAuthConfig();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown configuration error');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: {
      sessionTimeout: SESSION_TIMEOUT,
      jwtTokenExpiry: JWT_TOKEN_EXPIRY,
      refreshTokenExpiry: REFRESH_TOKEN_EXPIRY,
      bcryptRounds: BCRYPT_ROUNDS,
      passwordMinLength: PASSWORD_MIN_LENGTH,
      maxFailedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS
    }
  };
}
