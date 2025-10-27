/**
 * Security configuration for the application
 */

export const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Rate Limiting
  rateLimit: {
    enabled: process.env.ENABLE_RATE_LIMITING === 'true',
    requests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
    authRequests: 5, // 5 auth requests per minute
    uploadRequests: 10, // 10 uploads per minute
    bulkRequests: 5, // 5 bulk operations per 5 minutes
  },

  // Password Requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },

  // Session Configuration
  session: {
    timeout: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 60 * 60 * 1000, // 1 hour
    maxConcurrentSessions: 3,
  },

  // Two-Factor Authentication
  twoFactor: {
    enabled: true,
    issuer: 'MantisNXT',
    algorithm: 'sha1',
    digits: 6,
    period: 30,
  },

  // API Security
  api: {
    enableCORS: true,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    enableCSRF: true,
    enableSecurityHeaders: true,
  },

  // Audit Logging
  audit: {
    enabled: true,
    logLevel: process.env.AUDIT_LOG_LEVEL || 'medium',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90'),
    endpoint: process.env.AUDIT_LOG_ENDPOINT,
    token: process.env.AUDIT_LOG_TOKEN,
  },

  // File Upload Security
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760'), // 10MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    scanForMalware: true,
    quarantineSuspicious: true,
  },

  // IP Whitelisting
  ipWhitelist: {
    enabled: process.env.ENABLE_IP_WHITELIST === 'true',
    allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
    blockedIPs: process.env.BLOCKED_IPS?.split(',') || [],
  },

  // Security Headers
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
};

export default securityConfig;

