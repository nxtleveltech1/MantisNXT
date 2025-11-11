/**
 * Security utilities for South African regulatory compliance
 * Includes POPIA compliance, SA ID validation, and data protection
 */

import crypto from 'crypto';

// South African ID Number validation and masking
export const maskSAID = (id: string): string => {
  if (!id || id.length < 13) return id;
  return id.slice(0, 6) + '*******';
};

export const validateSAID = (id: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!id) {
    errors.push('ID number is required');
    return { isValid: false, errors };
  }

  // Remove spaces and ensure 13 digits
  const cleanId = id.replace(/\s/g, '');
  if (!/^\d{13}$/.test(cleanId)) {
    errors.push('ID number must be exactly 13 digits');
    return { isValid: false, errors };
  }

  // Extract date components
  const year = parseInt(cleanId.substring(0, 2));
  const month = parseInt(cleanId.substring(2, 4));
  const day = parseInt(cleanId.substring(4, 6));

  // Validate date
  const fullYear = year > 21 ? 1900 + year : 2000 + year; // Assuming cutoff at 2021
  const date = new Date(fullYear, month - 1, day);

  if (date.getFullYear() !== fullYear ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day) {
    errors.push('Invalid birth date in ID number');
  }

  // Validate citizenship (7th digit: 0=SA citizen, 1=permanent resident)
  const citizenship = parseInt(cleanId.substring(10, 11));
  if (citizenship !== 0 && citizenship !== 1) {
    errors.push('Invalid citizenship indicator');
  }

  // Luhn algorithm check
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let digit = parseInt(cleanId[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit = Math.floor(digit / 10) + (digit % 10);
    }
    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== parseInt(cleanId[12])) {
    errors.push('Invalid ID number checksum');
  }

  return { isValid: errors.length === 0, errors };
};

// VAT Number validation
export const validateVATNumber = (vatNumber: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!vatNumber) {
    errors.push('VAT number is required');
    return { isValid: false, errors };
  }

  const cleanVat = vatNumber.replace(/\s/g, '');
  if (!/^\d{10}$/.test(cleanVat)) {
    errors.push('VAT number must be exactly 10 digits');
    return { isValid: false, errors };
  }

  // Basic validation - starts with 4
  if (!cleanVat.startsWith('4')) {
    errors.push('SA VAT numbers typically start with 4');
  }

  return { isValid: errors.length === 0, errors };
};

// Company registration number validation
export const validateCompanyRegNumber = (regNumber: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!regNumber) {
    errors.push('Company registration number is required');
    return { isValid: false, errors };
  }

  // Format: 2002/123456/07 or 1998/123456/23
  const pattern = /^\d{4}\/\d{6}\/\d{2}$/;
  if (!pattern.test(regNumber)) {
    errors.push('Invalid company registration format. Expected: YYYY/NNNNNN/NN');
  }

  return { isValid: errors.length === 0, errors };
};

// Data encryption utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

export const encryptSensitiveData = (data: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
};

export const decryptSensitiveData = (encryptedData: string): string => {
  try {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
};

// Password security utilities
export const generateSecurePassword = (length: number = 12): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
};

export const validatePasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Password must be at least 8 characters long');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password must contain lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password must contain uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Password must contain numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Password must contain special characters');

  if (password.length >= 12) score += 1;

  return {
    score,
    feedback,
    isStrong: score >= 4
  };
};

// IP address utilities
export const isValidIPAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

export const isIPInRange = (ip: string, range: string): boolean => {
  // Simple CIDR check for IPv4
  const [rangeIP, prefix] = range.split('/');
  if (!prefix) return ip === rangeIP;

  const ipParts = ip.split('.').map(Number);
  const rangeParts = rangeIP.split('.').map(Number);
  const prefixLength = parseInt(prefix);

  let mask = 0;
  for (let i = 0; i < prefixLength; i++) {
    mask |= 1 << (31 - i);
  }

  const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const rangeInt = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];

  return (ipInt & mask) === (rangeInt & mask);
};

// Data sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim();
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .trim();
};

// Audit logging
export interface AuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details?: unknown;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

export const createAuditLog = (
  userId: string,
  action: string,
  resource: string,
  success: boolean = true,
  details?: unknown,
  ipAddress?: string,
  userAgent?: string
): AuditLog => {
  return {
    timestamp: new Date(),
    userId,
    action,
    resource,
    details,
    ipAddress,
    userAgent,
    success
  };
};

// Rate limiting utilities
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const userRequests = this.requests.get(identifier)!;

    // Remove old requests
    const validRequests = userRequests.filter(time => time > windowStart);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}