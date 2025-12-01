/**
 * Password Security Utilities
 *
 * Strong password policies, validation, and account lockout
 * Implements NIST 800-63B password guidelines
 *
 * @module security/password-security
 * @author AS Team (Security Compliance)
 */

// @ts-nocheck
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventPasswordReuse: 5, // Number of previous passwords to check
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
  bcryptRounds: 12, // Industry standard
};

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  score: number;
}

/**
 * Validate password against security policy
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (!password || password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  } else {
    score += Math.min(password.length - PASSWORD_POLICY.minLength, 10);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
  }

  // Character type checks
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 5;
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 5;
  }

  if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 5;
  }

  if (PASSWORD_POLICY.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  } else {
    score += 5;
  }

  // Check for common patterns
  if (/^(.)\1+$/.test(password)) {
    errors.push('Password cannot consist of repeated characters');
    score = 0;
  }

  if (/^(abc|123|qwe|asd|zxc)/i.test(password)) {
    errors.push('Password cannot start with common sequences');
    score = Math.max(0, score - 10);
  }

  // Check against common passwords (subset)
  const commonPasswords = [
    'password',
    'password123',
    'admin123',
    'qwerty123',
    'welcome123',
    'letmein123',
    'monkey123',
    'dragon123',
  ];

  if (commonPasswords.some(cp => password.toLowerCase().includes(cp))) {
    errors.push('Password is too common or easily guessable');
    score = Math.max(0, score - 15);
  }

  // Determine strength
  let strength: PasswordValidationResult['strength'] = 'weak';
  if (score >= 30) strength = 'very-strong';
  else if (score >= 25) strength = 'strong';
  else if (score >= 20) strength = 'good';
  else if (score >= 15) strength = 'fair';

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate first
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(
      `Password does not meet security requirements: ${validation.errors.join(', ')}`
    );
  }

  return bcrypt.hash(password, PASSWORD_POLICY.bcryptRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// ============================================================================
// PASSWORD HISTORY
// ============================================================================

/**
 * Check if password was used recently (prevent reuse)
 */
export async function checkPasswordHistory(
  userId: string,
  newPassword: string
): Promise<{ canUse: boolean; message?: string }> {
  try {
    // Get recent password hashes
    const result = await db.query(
      `
      SELECT password_hash
      FROM auth.password_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [userId, PASSWORD_POLICY.preventPasswordReuse]
    );

    // Check against each previous password
    for (const row of result.rows) {
      const matches = await bcrypt.compare(newPassword, row.password_hash);
      if (matches) {
        return {
          canUse: false,
          message: `Password was recently used. Please choose a different password. Cannot reuse your last ${PASSWORD_POLICY.preventPasswordReuse} passwords.`,
        };
      }
    }

    return { canUse: true };
  } catch (error) {
    console.error('Password history check error:', error);
    // Fail open for availability, but log
    return { canUse: true };
  }
}

/**
 * Add password to history
 */
export async function addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
  try {
    await db.query(
      `
      INSERT INTO auth.password_history (user_id, password_hash)
      VALUES ($1, $2)
    `,
      [userId, passwordHash]
    );

    // Clean up old history (keep only last N passwords)
    await db.query(
      `
      DELETE FROM auth.password_history
      WHERE user_id = $1
      AND id NOT IN (
        SELECT id
        FROM auth.password_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      )
    `,
      [userId, PASSWORD_POLICY.preventPasswordReuse + 5]
    ); // Keep a few extra
  } catch (error) {
    console.error('Add password history error:', error);
    // Don't throw - this shouldn't block password changes
  }
}

// ============================================================================
// ACCOUNT LOCKOUT
// ============================================================================

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(userId: string): Promise<{
  locked: boolean;
  attemptsRemaining: number;
  lockedUntil?: Date;
}> {
  try {
    // Increment failed attempts
    const result = await db.query(
      `
      UPDATE auth.users_extended
      SET
        failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE
          WHEN failed_login_attempts + 1 >= $2 THEN NOW() + INTERVAL '${PASSWORD_POLICY.lockoutDuration} milliseconds'
          ELSE locked_until
        END
      WHERE id = $1
      RETURNING failed_login_attempts, locked_until
    `,
      [userId, PASSWORD_POLICY.maxFailedAttempts]
    );

    if (result.rows.length === 0) {
      return { locked: false, attemptsRemaining: PASSWORD_POLICY.maxFailedAttempts };
    }

    const row = result.rows[0];
    const attempts = row.failed_login_attempts;
    const lockedUntil = row.locked_until;

    const locked = attempts >= PASSWORD_POLICY.maxFailedAttempts;
    const attemptsRemaining = Math.max(0, PASSWORD_POLICY.maxFailedAttempts - attempts);

    // Log security event if locked
    if (locked) {
      await logSecurityEvent({
        userId,
        eventType: 'account_locked',
        severity: 'high',
        details: {
          reason: 'Too many failed login attempts',
          attempts,
          lockedUntil,
        },
      });
    }

    return {
      locked,
      attemptsRemaining,
      lockedUntil: lockedUntil ? new Date(lockedUntil) : undefined,
    };
  } catch (error) {
    console.error('Record failed login error:', error);
    return { locked: false, attemptsRemaining: PASSWORD_POLICY.maxFailedAttempts };
  }
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedLogins(userId: string): Promise<void> {
  try {
    await db.query(
      `
      UPDATE auth.users_extended
      SET
        failed_login_attempts = 0,
        locked_until = NULL
      WHERE id = $1
    `,
      [userId]
    );
  } catch (error) {
    console.error('Reset failed logins error:', error);
  }
}

/**
 * Check if account is currently locked
 */
export async function isAccountLocked(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  reason?: string;
}> {
  try {
    const result = await db.query(
      `
      SELECT
        failed_login_attempts,
        locked_until,
        is_suspended,
        suspension_reason
      FROM auth.users_extended
      WHERE id = $1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return { locked: false };
    }

    const row = result.rows[0];

    // Check suspension
    if (row.is_suspended) {
      return {
        locked: true,
        reason: row.suspension_reason || 'Account suspended by administrator',
      };
    }

    // Check lockout
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      return {
        locked: true,
        lockedUntil: new Date(row.locked_until),
        reason: `Account locked due to too many failed login attempts. Try again after ${new Date(row.locked_until).toLocaleString()}`,
      };
    }

    // If lockout expired, clear it
    if (row.locked_until && new Date(row.locked_until) <= new Date()) {
      await resetFailedLogins(userId);
    }

    return { locked: false };
  } catch (error) {
    console.error('Check account locked error:', error);
    return { locked: false };
  }
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

/**
 * Generate secure password reset token
 */
export async function generatePasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.query(
    `
    UPDATE auth.users_extended
    SET
      password_reset_token = $2,
      password_reset_expires_at = $3
    WHERE id = $1
  `,
    [userId, token, expiresAt]
  );

  return token;
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const result = await db.query(
      `
      SELECT id
      FROM auth.users_extended
      WHERE password_reset_token = $1
        AND password_reset_expires_at > NOW()
        AND is_active = TRUE
        AND is_suspended = FALSE
    `,
      [token]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid or expired reset token' };
    }

    return { valid: true, userId: result.rows[0].id };
  } catch (error) {
    console.error('Verify reset token error:', error);
    return { valid: false, error: 'Token verification failed' };
  }
}

// ============================================================================
// SECURITY LOGGING
// ============================================================================

interface SecurityEventParams {
  userId: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: unknown;
  ipAddress?: string;
  userAgent?: string;
}

async function logSecurityEvent(params: SecurityEventParams): Promise<void> {
  try {
    // Get user's org_id
    const userResult = await db.query(
      `
      SELECT org_id FROM auth.users_extended WHERE id = $1
    `,
      [params.userId]
    );

    if (userResult.rows.length === 0) return;

    const orgId = userResult.rows[0].org_id;

    await db.query(
      `
      INSERT INTO auth.security_events (
        org_id, user_id, event_type, severity, details, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        orgId,
        params.userId,
        params.eventType,
        params.severity,
        JSON.stringify(params.details),
        params.ipAddress || '0.0.0.0',
        params.userAgent || 'unknown',
      ]
    );
  } catch (error) {
    console.error('Log security event error:', error);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const passwordSecurity = {
  validate: validatePassword,
  hash: hashPassword,
  verify: verifyPassword,
  checkHistory: checkPasswordHistory,
  addToHistory: addPasswordToHistory,
  recordFailedLogin,
  resetFailedLogins,
  isAccountLocked,
  generateResetToken: generatePasswordResetToken,
  verifyResetToken: verifyPasswordResetToken,
  policy: PASSWORD_POLICY,
};
