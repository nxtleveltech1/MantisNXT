/**
 * Secure Input Validation and Storage Utilities
 * Provides comprehensive input sanitization, validation, and CSRF protection
 * Browser-compatible using Web Crypto API
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Secure storage key prefix
 */
const SECURE_STORAGE_PREFIX = '__secure_';

/**
 * Convert string to ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Generate encryption key from password using PBKDF2
 */
async function generateKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using Web Crypto API
 */
async function encrypt(data: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await generateKey(password, salt.buffer);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    stringToArrayBuffer(data)
  );

  return JSON.stringify({
    salt: arrayBufferToHex(salt.buffer),
    iv: arrayBufferToHex(iv.buffer),
    data: arrayBufferToHex(encrypted),
  });
}

/**
 * Decrypt data using Web Crypto API
 */
async function decrypt(encryptedData: string, password: string): Promise<string> {
  const parsed = JSON.parse(encryptedData);
  const salt = hexToArrayBuffer(parsed.salt);
  const iv = hexToArrayBuffer(parsed.iv);
  const encrypted = hexToArrayBuffer(parsed.data);

  const key = await generateKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Get encryption password (derived from user session)
 */
function getEncryptionPassword(): string {
  // In production, this should be derived from user session/token
  // For now, use a session-based key
  return `mantisnxt_${Date.now()}`;
}

/**
 * Secure localStorage wrapper
 */
export class SecureStorage {
  private static password: string | null = null;

  private static async getPassword(): Promise<string> {
    if (!this.password) {
      this.password = getEncryptionPassword();
    }
    return this.password;
  }

  /**
   * Store data securely
   */
  static async setItem(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const password = await this.getPassword();
      const data = {
        value,
        timestamp: Date.now(),
        ttl,
      };

      const encrypted = await encrypt(JSON.stringify(data), password);
      localStorage.setItem(`${SECURE_STORAGE_PREFIX}${key}`, encrypted);
    } catch (error) {
      console.error('Secure storage error:', error);
      throw new Error('Failed to store data securely');
    }
  }

  /**
   * Retrieve data securely
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const password = await this.getPassword();
      const encrypted = localStorage.getItem(`${SECURE_STORAGE_PREFIX}${key}`);

      if (!encrypted) {
        return null;
      }

      const decrypted = await decrypt(encrypted, password);
      const data = JSON.parse(decrypted);

      // Check TTL
      if (data.ttl && Date.now() - data.timestamp > data.ttl) {
        await this.removeItem(key);
        return null;
      }

      return data.value as T;
    } catch (error) {
      console.error('Secure retrieval error:', error);
      return null;
    }
  }

  /**
   * Remove secure data
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(`${SECURE_STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error('Secure remove error:', error);
    }
  }

  /**
   * Clear all secure data
   */
  static clear(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(SECURE_STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Secure clear error:', error);
    }
  }
}

/**
 * Secure credential storage
 */
export class CredentialManager {
  private static readonly CREDENTIAL_KEY = 'credentials';
  private static readonly EXPIRATION_TIME = 30 * 60 * 1000; // 30 minutes

  /**
   * Store credentials securely
   */
  static async storeCredentials(credentials: {
    consumerKey: string;
    consumerSecret: string;
  }): Promise<void> {
    await SecureStorage.setItem(
      this.CREDENTIAL_KEY,
      credentials,
      this.EXPIRATION_TIME
    );
  }

  /**
   * Retrieve credentials securely
   */
  static async getCredentials(): Promise<{ consumerKey: string; consumerSecret: string } | null> {
    return await SecureStorage.getItem<{ consumerKey: string; consumerSecret: string }>(
      this.CREDENTIAL_KEY
    );
  }

  /**
   * Clear stored credentials
   */
  static clearCredentials(): void {
    SecureStorage.removeItem(this.CREDENTIAL_KEY);
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly ALPHANUMERIC_REGEX = /^[a-zA-Z0-9\s\-_]+$/;
  private static readonly SAFE_STRING_REGEX = /^[a-zA-Z0-9\s\-_.,!?()]+$/;

  /**
   * Sanitize input string to prevent XSS and injection attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Remove control characters except tab, newline, carriage return
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Basic HTML escaping
    sanitized = sanitized
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');

    return sanitized.trim();
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(input: string): boolean {
    return this.UUID_REGEX.test(input);
  }

  /**
   * Validate email format
   */
  static isValidEmail(input: string): boolean {
    return this.EMAIL_REGEX.test(input) && input.length <= 254; // RFC 5321 limit
  }

  /**
   * Validate alphanumeric string with limited special characters
   */
  static isValidAlphanumeric(input: string): boolean {
    return this.ALPHANUMERIC_REGEX.test(input) && input.length <= 100;
  }

  /**
   * Validate safe string (letters, numbers, basic punctuation)
   */
  static isValidSafeString(input: string): boolean {
    return this.SAFE_STRING_REGEX.test(input) && input.length <= 500;
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Must have protocol
      if (!urlObj.protocol || !['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Must have hostname
      if (!hostname) return false;

      // Block localhost and private IPs
      if (hostname === 'localhost' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
        return false;
      }

      // Block internal domains
      if (hostname.endsWith('.local') ||
          hostname.endsWith('.internal') ||
          hostname.endsWith('.intranet') ||
          hostname.endsWith('.corp')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate consumer key format (WooCommerce)
   */
  static validateConsumerKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;

    // WooCommerce consumer keys start with 'ck_'
    return key.startsWith('ck_') && key.length >= 32 && key.length <= 128;
  }

  /**
   * Validate consumer secret format (WooCommerce)
   */
  static validateConsumerSecret(secret: string): boolean {
    if (!secret || typeof secret !== 'string') return false;

    // WooCommerce consumer secrets start with 'cs_'
    return secret.startsWith('cs_') && secret.length >= 32 && secret.length <= 128;
  }

  /**
   * Validate entity type for WooCommerce
   */
  static validateEntityType(entity: string): boolean {
    const validEntities = ['products', 'orders', 'customers', 'categories'];
    return validEntities.includes(entity);
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page: number, pageSize: number): boolean {
    return Number.isInteger(page) && page >= 1 &&
           Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100;
  }

  /**
   * Validate sync status
   */
  static validateSyncStatus(status: string): boolean {
    const validStatuses = ['pending', 'syncing', 'completed', 'failed', 'cancelled'];
    return validStatuses.includes(status);
  }

  /**
   * Validate queue status
   */
  static validateQueueStatus(status: string): boolean {
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    return validStatuses.includes(status);
  }

  /**
   * Validate operation type
   */
  static validateOperation(operation: string): boolean {
    const validOperations = ['create', 'update', 'delete', 'read', 'list'];
    return validOperations.includes(operation);
  }
}

/**
 * CSRF Protection utilities
 */
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_LIFETIME = 30 * 60 * 1000; // 30 minutes
  private static readonly TOKENS = new Map<string, { token: string; expires: number }>();

  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    const array = new Uint8Array(this.TOKEN_LENGTH);
    crypto.getRandomValues(array);
    const token = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const expires = Date.now() + this.TOKEN_LIFETIME;

    // Clean up expired tokens periodically
    this.cleanup();

    // Store token
    this.TOKENS.set(token, { token, expires });

    return token;
  }

  /**
   * Get CSRF token (async wrapper for consistency)
   */
  static async getToken(): Promise<string> {
    return this.generateToken();
  }

  /**
   * Validate CSRF token
   */
  static async validateToken(token: string): Promise<boolean> {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const stored = this.TOKENS.get(token);
    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expires) {
      this.TOKENS.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired tokens
   */
  private static cleanup(): void {
    const now = Date.now();
    for (const [token, data] of this.TOKENS.entries()) {
      if (now > data.expires) {
        this.TOKENS.delete(token);
      }
    }
  }

  /**
   * Clear all tokens (for testing)
   */
  static clearTokens(): void {
    this.TOKENS.clear();
  }
}

/**
 * Secure password validation
 */
export class PasswordValidator {
  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (/^(.)\1{2,}/.test(password)) {
      errors.push('Password must not contain repeated characters');
    }

    if (/123456|abcdef|qwerty|password/i.test(password)) {
      errors.push('Password must not contain common patterns');
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * SQL Injection Prevention Utilities
 */
export class SQLInjectionPrevention {
  /**
   * Check for SQL injection patterns
   */
  static detectSQLInjection(input: string): boolean {
    if (typeof input !== 'string') return false;

    const sqlPatterns = [
      /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b)/i,
      /('|"|%|;|--|\*|\/\*|\*\/|xp_|sp_|exec|execute)/i,
      /(\bor\b|\band\b)\s+\w*\s*[=<>]/i,
      /information_schema/i,
      /mysql\.user/i,
      /pg_user/i,
      /sysobjects/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize query parameters
   */
  static sanitizeQueryParams(params: any[]): any[] {
    return params.map(param => {
      if (typeof param === 'string') {
        // Double any single quotes to prevent SQL injection
        return param.replace(/'/g, "''");
      }
      return param;
    });
  }
}

export default {
  SecureStorage,
  CredentialManager,
  InputValidator,
  CSRFProtection,
  PasswordValidator,
  SQLInjectionPrevention
};