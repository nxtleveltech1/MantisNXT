/**
 * TOTP Two-Factor Authentication Service
 *
 * Real TOTP implementation with rate limiting and backup codes
 * Implements RFC 6238 (TOTP) standard
 *
 * @module security/totp-service
 * @author AS Team (Security Compliance)
 */

// @ts-nocheck
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '@/lib/database';
import { encryptPII, decryptPII } from './encryption';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOTP_CONFIG = {
  issuer: 'MantisNXT',
  algorithm: 'sha1' as const,
  digits: 6,
  step: 30, // 30 seconds
  window: 1, // Allow 1 step before/after for clock skew
  encoding: 'base32' as const,
  maxAttempts: 3, // Max verification attempts per period
  cooldownPeriod: 5 * 60 * 1000, // 5 minutes cooldown after max attempts
  backupCodesCount: 10,
};

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  cooldownUntil?: number;
}

// In-memory rate limiting (should use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if user is rate limited for 2FA attempts
 */
function checkRateLimit(userId: string): {
  allowed: boolean;
  attemptsRemaining: number;
  cooldownUntil?: Date;
} {
  const key = `2fa:${userId}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { allowed: true, attemptsRemaining: TOTP_CONFIG.maxAttempts };
  }

  // Check cooldown
  if (entry.cooldownUntil && entry.cooldownUntil > now) {
    return {
      allowed: false,
      attemptsRemaining: 0,
      cooldownUntil: new Date(entry.cooldownUntil),
    };
  }

  // Reset if last attempt was more than cooldown period ago
  if (now - entry.lastAttempt > TOTP_CONFIG.cooldownPeriod) {
    rateLimitStore.delete(key);
    return { allowed: true, attemptsRemaining: TOTP_CONFIG.maxAttempts };
  }

  return {
    allowed: entry.attempts < TOTP_CONFIG.maxAttempts,
    attemptsRemaining: Math.max(0, TOTP_CONFIG.maxAttempts - entry.attempts),
  };
}

/**
 * Record 2FA verification attempt
 */
function recordAttempt(userId: string, success: boolean): void {
  const key = `2fa:${userId}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { attempts: 0, lastAttempt: now };

  if (success) {
    // Reset on success
    rateLimitStore.delete(key);
    return;
  }

  entry.attempts += 1;
  entry.lastAttempt = now;

  // Set cooldown if max attempts reached
  if (entry.attempts >= TOTP_CONFIG.maxAttempts) {
    entry.cooldownUntil = now + TOTP_CONFIG.cooldownPeriod;
  }

  rateLimitStore.set(key, entry);
}

// ============================================================================
// TOTP SETUP
// ============================================================================

export interface TOTPSetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  manualEntryKey: string;
}

/**
 * Generate TOTP secret and QR code for user
 */
export async function setupTOTP(userId: string, userEmail: string): Promise<TOTPSetupResult> {
  try {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${TOTP_CONFIG.issuer} (${userEmail})`,
      issuer: TOTP_CONFIG.issuer,
      length: 32,
    });

    if (!secret.base32) {
      throw new Error('Failed to generate TOTP secret');
    }

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Encrypt secret and backup codes before storing
    const encryptedSecret = encryptPII(secret.base32);
    const encryptedBackupCodes = backupCodes.map(code => encryptPII(code));

    // Store in database (not yet enabled)
    await db.query(
      `
      UPDATE auth.users_extended
      SET
        two_factor_secret = $2,
        two_factor_backup_codes = $3,
        two_factor_enabled = FALSE
      WHERE id = $1
    `,
      [userId, encryptedSecret, encryptedBackupCodes]
    );

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
      manualEntryKey: secret.base32,
    };
  } catch (error) {
    console.error('TOTP setup error:', error);
    throw new Error('Failed to setup two-factor authentication');
  }
}

/**
 * Verify TOTP code and enable 2FA
 */
export async function enableTOTP(
  userId: string,
  code: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Too many attempts. Please try again after ${rateLimit.cooldownUntil?.toLocaleTimeString()}`,
      };
    }

    // Get encrypted secret
    const result = await db.query(
      `
      SELECT two_factor_secret
      FROM auth.users_extended
      WHERE id = $1
    `,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].two_factor_secret) {
      return { success: false, error: 'Two-factor authentication not setup' };
    }

    // Decrypt secret
    const secret = decryptPII(result.rows[0].two_factor_secret);

    // Verify code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: TOTP_CONFIG.encoding,
      token: code,
      window: TOTP_CONFIG.window,
    });

    recordAttempt(userId, verified);

    if (!verified) {
      return {
        success: false,
        error: `Invalid verification code. ${rateLimit.attemptsRemaining - 1} attempts remaining.`,
      };
    }

    // Enable 2FA
    await db.query(
      `
      UPDATE auth.users_extended
      SET
        two_factor_enabled = TRUE,
        two_factor_enabled_at = NOW()
      WHERE id = $1
    `,
      [userId]
    );

    // Log security event
    await logSecurityEvent(userId, 'two_factor_enabled', 'medium');

    return { success: true };
  } catch (error) {
    console.error('Enable TOTP error:', error);
    return { success: false, error: 'Failed to enable two-factor authentication' };
  }
}

// ============================================================================
// TOTP VERIFICATION
// ============================================================================

export interface TOTPVerificationResult {
  valid: boolean;
  error?: string;
  attemptsRemaining?: number;
  cooldownUntil?: Date;
}

/**
 * Verify TOTP code for login
 */
export async function verifyTOTP(userId: string, code: string): Promise<TOTPVerificationResult> {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return {
        valid: false,
        error: `Too many attempts. Please try again after ${rateLimit.cooldownUntil?.toLocaleTimeString()}`,
        attemptsRemaining: 0,
        cooldownUntil: rateLimit.cooldownUntil,
      };
    }

    // Get user's encrypted secret and backup codes
    const result = await db.query(
      `
      SELECT
        two_factor_secret,
        two_factor_backup_codes,
        two_factor_enabled
      FROM auth.users_extended
      WHERE id = $1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'User not found' };
    }

    const row = result.rows[0];

    if (!row.two_factor_enabled) {
      return { valid: false, error: 'Two-factor authentication not enabled' };
    }

    if (!row.two_factor_secret) {
      return { valid: false, error: 'Two-factor authentication not properly configured' };
    }

    // Decrypt secret
    const secret = decryptPII(row.two_factor_secret);

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: TOTP_CONFIG.encoding,
      token: code,
      window: TOTP_CONFIG.window,
    });

    if (verified) {
      recordAttempt(userId, true);
      await logSecurityEvent(userId, 'two_factor_verified', 'low');
      return { valid: true };
    }

    // Check backup codes if TOTP failed
    if (row.two_factor_backup_codes && row.two_factor_backup_codes.length > 0) {
      const backupValid = await verifyBackupCode(userId, code, row.two_factor_backup_codes);
      if (backupValid) {
        recordAttempt(userId, true);
        return { valid: true };
      }
    }

    // Record failed attempt
    recordAttempt(userId, false);

    return {
      valid: false,
      error: 'Invalid verification code',
      attemptsRemaining: rateLimit.attemptsRemaining - 1,
    };
  } catch (error) {
    console.error('Verify TOTP error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * Verify backup code
 */
async function verifyBackupCode(
  userId: string,
  code: string,
  encryptedBackupCodes: string[]
): Promise<boolean> {
  try {
    // Decrypt all backup codes
    const backupCodes = encryptedBackupCodes.map(encrypted => decryptPII(encrypted));

    // Check if code matches
    const index = backupCodes.indexOf(code);
    if (index === -1) {
      return false;
    }

    // Remove used backup code
    const remainingCodes = encryptedBackupCodes.filter((_, i) => i !== index);

    await db.query(
      `
      UPDATE auth.users_extended
      SET two_factor_backup_codes = $2
      WHERE id = $1
    `,
      [userId, remainingCodes]
    );

    await logSecurityEvent(userId, 'backup_code_used', 'medium', {
      remainingCodes: remainingCodes.length,
    });

    return true;
  } catch (error) {
    console.error('Verify backup code error:', error);
    return false;
  }
}

// ============================================================================
// BACKUP CODES
// ============================================================================

/**
 * Generate secure backup codes
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];

  for (let i = 0; i < TOTP_CONFIG.backupCodesCount; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  try {
    const backupCodes = generateBackupCodes();
    const encryptedBackupCodes = backupCodes.map(code => encryptPII(code));

    await db.query(
      `
      UPDATE auth.users_extended
      SET two_factor_backup_codes = $2
      WHERE id = $1
    `,
      [userId, encryptedBackupCodes]
    );

    await logSecurityEvent(userId, 'backup_codes_regenerated', 'medium');

    return backupCodes;
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    throw new Error('Failed to regenerate backup codes');
  }
}

// ============================================================================
// DISABLE 2FA
// ============================================================================

/**
 * Disable TOTP for user (requires admin or user verification)
 */
export async function disableTOTP(
  userId: string,
  verificationCode: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verify current code before disabling
    const verification = await verifyTOTP(userId, verificationCode);

    if (!verification.valid) {
      return {
        success: false,
        error: 'Invalid verification code. Please provide a valid code to disable 2FA.',
      };
    }

    // Disable 2FA
    await db.query(
      `
      UPDATE auth.users_extended
      SET
        two_factor_enabled = FALSE,
        two_factor_secret = NULL,
        two_factor_backup_codes = NULL,
        two_factor_enabled_at = NULL
      WHERE id = $1
    `,
      [userId]
    );

    await logSecurityEvent(userId, 'two_factor_disabled', 'high');

    return { success: true };
  } catch (error) {
    console.error('Disable TOTP error:', error);
    return { success: false, error: 'Failed to disable two-factor authentication' };
  }
}

// ============================================================================
// SECURITY LOGGING
// ============================================================================

async function logSecurityEvent(
  userId: string,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: unknown
): Promise<void> {
  try {
    const userResult = await db.query(
      `
      SELECT org_id FROM auth.users_extended WHERE id = $1
    `,
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const orgId = userResult.rows[0].org_id;

    await db.query(
      `
      INSERT INTO auth.security_events (
        org_id, user_id, event_type, severity, details
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
      [orgId, userId, eventType, severity, JSON.stringify(details || {})]
    );
  } catch (error) {
    console.error('Log security event error:', error);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const totpService = {
  setup: setupTOTP,
  enable: enableTOTP,
  verify: verifyTOTP,
  disable: disableTOTP,
  regenerateBackupCodes,
  config: TOTP_CONFIG,
};
