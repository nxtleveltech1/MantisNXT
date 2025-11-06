/**
 * PII Encryption Utilities
 *
 * Field-level encryption for sensitive personal information
 * POPIA Compliance - South African Personal Information Protection Act
 *
 * @module security/encryption
 * @author AS Team (Security Compliance)
 */

import crypto from 'crypto'

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 64

// Get encryption key from environment or generate (should be in secrets manager)
const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  console.error('CRITICAL: PII_ENCRYPTION_KEY not set in environment variables')
  throw new Error('PII encryption key not configured - cannot process sensitive data')
}

// Derive a 256-bit key from the environment key using PBKDF2
const MASTER_KEY = crypto.pbkdf2Sync(
  ENCRYPTION_KEY,
  process.env.PII_ENCRYPTION_SALT || 'mantis-nxt-salt-v1',
  100000,
  KEY_LENGTH,
  'sha256'
)

// ============================================================================
// ENCRYPTION FUNCTIONS
// ============================================================================

/**
 * Encrypt sensitive data with AES-256-GCM
 * Returns base64-encoded encrypted data with IV and auth tag
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext) return ''

  try {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv)

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Combine IV + auth tag + encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ])

    return combined.toString('base64')
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt sensitive data')
  }
}

/**
 * Decrypt sensitive data encrypted with encryptPII
 */
export function decryptPII(encryptedData: string): string {
  if (!encryptedData) return ''

  try {
    // Decode base64
    const combined = Buffer.from(encryptedData, 'base64')

    // Extract components
    const iv = combined.slice(0, IV_LENGTH)
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH)

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv)
    decipher.setAuthTag(authTag)

    // Decrypt
    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt sensitive data')
  }
}

/**
 * Hash sensitive data for searching (one-way)
 * Use for ID numbers when you need to search but not display
 */
export function hashPII(data: string): string {
  if (!data) return ''

  return crypto
    .createHmac('sha256', MASTER_KEY)
    .update(data)
    .digest('hex')
}

/**
 * Generate a secure encryption key (for initial setup)
 * Store this in AWS Secrets Manager, Azure Key Vault, or similar
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64')
}

// ============================================================================
// PII FIELD HELPERS
// ============================================================================

/**
 * Encrypt South African ID number
 * Format validation included
 */
export function encryptIDNumber(idNumber: string): string {
  if (!idNumber) return ''

  // Validate SA ID format (13 digits)
  const cleaned = idNumber.replace(/\s+/g, '')
  if (!/^\d{13}$/.test(cleaned)) {
    throw new Error('Invalid SA ID number format')
  }

  return encryptPII(cleaned)
}

/**
 * Decrypt South African ID number
 */
export function decryptIDNumber(encryptedID: string): string {
  if (!encryptedID) return ''

  const decrypted = decryptPII(encryptedID)

  // Return formatted (with spaces for readability)
  return decrypted.replace(/(\d{6})(\d{4})(\d{2})(\d)/, '$1 $2 $3 $4')
}

/**
 * Mask ID number for display (show only last 4 digits)
 */
export function maskIDNumber(idNumber: string): string {
  if (!idNumber) return ''

  const cleaned = idNumber.replace(/\s+/g, '')
  if (cleaned.length < 4) return '****'

  return '****-****-' + cleaned.slice(-4)
}

/**
 * Encrypt phone number
 */
export function encryptPhone(phone: string): string {
  if (!phone) return ''

  // Clean phone number
  const cleaned = phone.replace(/[^\d+]/g, '')
  return encryptPII(cleaned)
}

/**
 * Decrypt phone number
 */
export function decryptPhone(encryptedPhone: string): string {
  if (!encryptedPhone) return ''

  return decryptPII(encryptedPhone)
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Encrypt multiple PII fields at once
 */
export interface PIIFields {
  idNumber?: string
  phone?: string
  mobile?: string
  bankAccount?: string
  taxNumber?: string
}

export interface EncryptedPIIFields {
  idNumber?: string
  idNumberHash?: string // For searching
  phone?: string
  mobile?: string
  bankAccount?: string
  taxNumber?: string
}

export function encryptPIIFields(fields: PIIFields): EncryptedPIIFields {
  const encrypted: EncryptedPIIFields = {}

  if (fields.idNumber) {
    encrypted.idNumber = encryptIDNumber(fields.idNumber)
    encrypted.idNumberHash = hashPII(fields.idNumber.replace(/\s+/g, ''))
  }

  if (fields.phone) {
    encrypted.phone = encryptPhone(fields.phone)
  }

  if (fields.mobile) {
    encrypted.mobile = encryptPhone(fields.mobile)
  }

  if (fields.bankAccount) {
    encrypted.bankAccount = encryptPII(fields.bankAccount)
  }

  if (fields.taxNumber) {
    encrypted.taxNumber = encryptPII(fields.taxNumber)
  }

  return encrypted
}

/**
 * Decrypt multiple PII fields at once
 */
export function decryptPIIFields(encryptedFields: EncryptedPIIFields): PIIFields {
  const decrypted: PIIFields = {}

  if (encryptedFields.idNumber) {
    decrypted.idNumber = decryptIDNumber(encryptedFields.idNumber)
  }

  if (encryptedFields.phone) {
    decrypted.phone = decryptPhone(encryptedFields.phone)
  }

  if (encryptedFields.mobile) {
    decrypted.mobile = decryptPhone(encryptedFields.mobile)
  }

  if (encryptedFields.bankAccount) {
    decrypted.bankAccount = decryptPII(encryptedFields.bankAccount)
  }

  if (encryptedFields.taxNumber) {
    decrypted.taxNumber = decryptPII(encryptedFields.taxNumber)
  }

  return decrypted
}

// ============================================================================
// KEY ROTATION SUPPORT
// ============================================================================

/**
 * Re-encrypt data with a new key (for key rotation)
 * Old key must be available in environment as PII_ENCRYPTION_KEY_OLD
 */
export function reencryptPII(oldEncrypted: string, oldKey: string): string {
  // Temporarily use old key
  const oldMasterKey = crypto.pbkdf2Sync(
    oldKey,
    process.env.PII_ENCRYPTION_SALT || 'mantis-nxt-salt-v1',
    100000,
    KEY_LENGTH,
    'sha256'
  )

  // Decrypt with old key
  const combined = Buffer.from(oldEncrypted, 'base64')
  const iv = combined.slice(0, IV_LENGTH)
  const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, oldMasterKey, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(encrypted.toString('base64'), 'base64', 'utf8')
  plaintext += decipher.final('utf8')

  // Re-encrypt with new key
  return encryptPII(plaintext)
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log PII access for compliance auditing
 */
export async function logPIIAccess(params: {
  userId: string
  orgId: string
  targetUserId: string
  field: string
  operation: 'encrypt' | 'decrypt' | 'view' | 'export'
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  // TODO: Implement audit logging to secure table
  // This should be append-only and immutable
  console.log('[PII-ACCESS]', {
    timestamp: new Date().toISOString(),
    ...params
  })
}
