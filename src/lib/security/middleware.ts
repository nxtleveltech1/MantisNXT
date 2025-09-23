/**
 * Security middleware for request validation and protection
 * Implements rate limiting, IP whitelisting, and security headers
 */

import { RateLimiter, isValidIPAddress, isIPInRange } from './index';

export interface SecurityConfig {
  enableRateLimit: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
  enableIPWhitelist: boolean;
  whitelistedIPs: string[];
  enableSecurityHeaders: boolean;
  enableCSRFProtection: boolean;
  sessionTimeout: number;
}

export interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  userId?: string;
  isAuthenticated: boolean;
  permissions: string[];
}

export interface SecurityResult {
  allowed: boolean;
  reason?: string;
  riskScore: number;
  requiresAdditionalAuth?: boolean;
  blockedUntil?: Date;
}

export class SecurityMiddleware {
  private rateLimiter: RateLimiter;
  private config: SecurityConfig;
  private blockedIPs: Map<string, Date> = new Map();
  private suspiciousActivity: Map<string, number> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(
      config.rateLimitRequests,
      config.rateLimitWindow
    );
  }

  // Main security validation method
  validateRequest(
    request: {
      path: string;
      method: string;
      headers: Record<string, string>;
      body?: any;
    },
    context: SecurityContext
  ): SecurityResult {
    let riskScore = 0;
    const checks: Array<{ passed: boolean; risk: number; reason?: string }> = [];

    // 1. IP Address validation
    const ipCheck = this.validateIPAddress(context.ipAddress);
    checks.push(ipCheck);
    riskScore += ipCheck.risk;

    // 2. Rate limiting check
    if (this.config.enableRateLimit) {
      const rateLimitCheck = this.checkRateLimit(context.ipAddress);
      checks.push(rateLimitCheck);
      riskScore += rateLimitCheck.risk;
    }

    // 3. User agent validation
    const uaCheck = this.validateUserAgent(context.userAgent);
    checks.push(uaCheck);
    riskScore += uaCheck.risk;

    // 4. Suspicious activity detection
    const activityCheck = this.checkSuspiciousActivity(context);
    checks.push(activityCheck);
    riskScore += activityCheck.risk;

    // 5. Request pattern analysis
    const patternCheck = this.analyzeRequestPattern(request, context);
    checks.push(patternCheck);
    riskScore += patternCheck.risk;

    // 6. Authentication requirements
    const authCheck = this.validateAuthentication(request.path, context);
    checks.push(authCheck);
    riskScore += authCheck.risk;

    // Determine if request should be allowed
    const blockedCheck = checks.find(check => !check.passed);
    const allowed = !blockedCheck && riskScore < 80;

    // Update suspicious activity tracking
    if (riskScore > 50) {
      this.trackSuspiciousActivity(context.ipAddress, riskScore);
    }

    // Block IP if risk is too high
    if (riskScore > 90) {
      this.blockIP(context.ipAddress, 3600000); // 1 hour
    }

    return {
      allowed,
      reason: blockedCheck?.reason || (riskScore >= 80 ? 'High risk score' : undefined),
      riskScore,
      requiresAdditionalAuth: riskScore > 60 && riskScore < 80,
      blockedUntil: this.blockedIPs.get(context.ipAddress)
    };
  }

  // IP Address validation
  private validateIPAddress(ipAddress: string): { passed: boolean; risk: number; reason?: string } {
    // Check if IP is blocked
    const blockedUntil = this.blockedIPs.get(ipAddress);
    if (blockedUntil && blockedUntil > new Date()) {
      return {
        passed: false,
        risk: 100,
        reason: `IP blocked until ${blockedUntil.toISOString()}`
      };
    }

    // Clean up expired blocks
    if (blockedUntil && blockedUntil <= new Date()) {
      this.blockedIPs.delete(ipAddress);
    }

    // Validate IP format
    if (!isValidIPAddress(ipAddress)) {
      return {
        passed: false,
        risk: 80,
        reason: 'Invalid IP address format'
      };
    }

    // Check whitelist if enabled
    if (this.config.enableIPWhitelist) {
      const isWhitelisted = this.config.whitelistedIPs.some(allowedIP =>
        isIPInRange(ipAddress, allowedIP)
      );

      if (!isWhitelisted) {
        return {
          passed: false,
          risk: 90,
          reason: 'IP address not whitelisted'
        };
      }
    }

    // Check for known malicious IP patterns
    const riskScore = this.assessIPRisk(ipAddress);

    return {
      passed: riskScore < 70,
      risk: riskScore,
      reason: riskScore >= 70 ? 'High-risk IP address' : undefined
    };
  }

  // Rate limiting check
  private checkRateLimit(identifier: string): { passed: boolean; risk: number; reason?: string } {
    const allowed = this.rateLimiter.isAllowed(identifier);

    return {
      passed: allowed,
      risk: allowed ? 0 : 60,
      reason: allowed ? undefined : 'Rate limit exceeded'
    };
  }

  // User agent validation
  private validateUserAgent(userAgent: string): { passed: boolean; risk: number; reason?: string } {
    if (!userAgent || userAgent.length < 10) {
      return {
        passed: false,
        risk: 50,
        reason: 'Missing or invalid user agent'
      };
    }

    // Check for suspicious user agents
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /script/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    return {
      passed: !isSuspicious,
      risk: isSuspicious ? 40 : 5,
      reason: isSuspicious ? 'Suspicious user agent detected' : undefined
    };
  }

  // Suspicious activity detection
  private checkSuspiciousActivity(context: SecurityContext): { passed: boolean; risk: number; reason?: string } {
    const activityScore = this.suspiciousActivity.get(context.ipAddress) || 0;

    // Check for multiple failed login attempts
    if (context.userId && !context.isAuthenticated && activityScore > 30) {
      return {
        passed: false,
        risk: 70,
        reason: 'Multiple suspicious activities detected'
      };
    }

    return {
      passed: activityScore < 50,
      risk: Math.min(activityScore, 50),
      reason: activityScore >= 50 ? 'Suspicious activity pattern' : undefined
    };
  }

  // Request pattern analysis
  private analyzeRequestPattern(
    request: { path: string; method: string; headers: Record<string, string>; body?: any },
    context: SecurityContext
  ): { passed: boolean; risk: number; reason?: string } {
    let riskScore = 0;

    // Check for SQL injection patterns
    const sqlPatterns = [
      /('|(\\')|(;)|(\\;))/i,
      /(union|select|insert|delete|drop|create|alter)/i,
      /(or\s+1=1|and\s+1=1)/i
    ];

    const requestData = JSON.stringify(request.body || '') + request.path;
    const hasSQLPattern = sqlPatterns.some(pattern => pattern.test(requestData));

    if (hasSQLPattern) {
      riskScore += 80;
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /onload=/i,
      /onerror=/i,
      /<iframe/i
    ];

    const hasXSSPattern = xssPatterns.some(pattern => pattern.test(requestData));

    if (hasXSSPattern) {
      riskScore += 70;
    }

    // Check for path traversal
    if (request.path.includes('../') || request.path.includes('..\\')) {
      riskScore += 60;
    }

    // Check for sensitive file access attempts
    const sensitivePatterns = [
      /\.(env|config|key|pem|p12)$/i,
      /(passwd|shadow|hosts|htaccess)/i,
      /(database|backup|dump)/i
    ];

    const hasSensitivePattern = sensitivePatterns.some(pattern => pattern.test(request.path));

    if (hasSensitivePattern) {
      riskScore += 90;
    }

    return {
      passed: riskScore < 60,
      risk: riskScore,
      reason: riskScore >= 60 ? 'Malicious request pattern detected' : undefined
    };
  }

  // Authentication validation
  private validateAuthentication(
    path: string,
    context: SecurityContext
  ): { passed: boolean; risk: number; reason?: string } {
    // Define protected paths that require authentication
    const protectedPaths = [
      '/admin',
      '/api',
      '/dashboard',
      '/settings',
      '/profile'
    ];

    const requiresAuth = protectedPaths.some(protectedPath =>
      path.startsWith(protectedPath)
    );

    if (requiresAuth && !context.isAuthenticated) {
      return {
        passed: false,
        risk: 30,
        reason: 'Authentication required for this resource'
      };
    }

    // Check for privilege escalation attempts
    const adminPaths = ['/admin', '/api/admin'];
    const requiresAdmin = adminPaths.some(adminPath =>
      path.startsWith(adminPath)
    );

    if (requiresAdmin && !context.permissions.includes('admin')) {
      return {
        passed: false,
        risk: 50,
        reason: 'Insufficient permissions for this resource'
      };
    }

    return {
      passed: true,
      risk: 0
    };
  }

  // Assess IP address risk
  private assessIPRisk(ipAddress: string): number {
    let riskScore = 0;

    // Check for private/internal IPs (lower risk)
    const privateRanges = [
      '192.168.0.0/16',
      '10.0.0.0/8',
      '172.16.0.0/12',
      '127.0.0.0/8'
    ];

    const isPrivate = privateRanges.some(range => isIPInRange(ipAddress, range));
    if (isPrivate) {
      return 5; // Low risk for internal IPs
    }

    // Check for known malicious IP ranges (simplified)
    const maliciousRanges = [
      // Tor exit nodes (example ranges)
      '185.220.101.0/24',
      '199.87.154.0/24',
      // VPN/proxy ranges
      '5.79.70.0/24'
    ];

    const isMalicious = maliciousRanges.some(range => isIPInRange(ipAddress, range));
    if (isMalicious) {
      riskScore += 60;
    }

    // Geographic risk assessment (simplified)
    // In a real implementation, use GeoIP services
    const firstOctet = parseInt(ipAddress.split('.')[0]);
    if (firstOctet < 1 || firstOctet > 223) {
      riskScore += 40; // Invalid public IP range
    }

    return Math.min(riskScore, 100);
  }

  // Track suspicious activity
  private trackSuspiciousActivity(ipAddress: string, riskIncrease: number): void {
    const currentScore = this.suspiciousActivity.get(ipAddress) || 0;
    const newScore = Math.min(currentScore + riskIncrease, 100);
    this.suspiciousActivity.set(ipAddress, newScore);

    // Decay suspicious activity over time
    setTimeout(() => {
      const score = this.suspiciousActivity.get(ipAddress) || 0;
      const decayedScore = Math.max(0, score - 10);
      if (decayedScore === 0) {
        this.suspiciousActivity.delete(ipAddress);
      } else {
        this.suspiciousActivity.set(ipAddress, decayedScore);
      }
    }, 300000); // 5 minutes
  }

  // Block IP address
  private blockIP(ipAddress: string, durationMs: number): void {
    const blockedUntil = new Date(Date.now() + durationMs);
    this.blockedIPs.set(ipAddress, blockedUntil);

    // Clean up expired blocks
    setTimeout(() => {
      this.blockedIPs.delete(ipAddress);
    }, durationMs);
  }

  // Generate security headers
  generateSecurityHeaders(): Record<string, string> {
    if (!this.config.enableSecurityHeaders) {
      return {};
    }

    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'"
      ].join('; '),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()'
      ].join(', ')
    };
  }

  // CSRF token validation
  validateCSRFToken(token: string, sessionToken: string): boolean {
    if (!this.config.enableCSRFProtection) {
      return true;
    }

    // Simple CSRF validation - in production, use proper CSRF protection
    return token === sessionToken;
  }

  // Get security metrics
  getSecurityMetrics(): {
    blockedIPs: number;
    suspiciousActivities: number;
    rateLimitHits: number;
    averageRiskScore: number;
  } {
    const suspiciousScores = Array.from(this.suspiciousActivity.values());
    const averageRiskScore = suspiciousScores.length > 0
      ? suspiciousScores.reduce((sum, score) => sum + score, 0) / suspiciousScores.length
      : 0;

    return {
      blockedIPs: this.blockedIPs.size,
      suspiciousActivities: this.suspiciousActivity.size,
      rateLimitHits: 0, // Would need to track this in RateLimiter
      averageRiskScore
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update rate limiter if needed
    if (newConfig.rateLimitRequests || newConfig.rateLimitWindow) {
      this.rateLimiter = new RateLimiter(
        this.config.rateLimitRequests,
        this.config.rateLimitWindow
      );
    }
  }

  // Clear security state
  clearSecurityState(): void {
    this.blockedIPs.clear();
    this.suspiciousActivity.clear();
    this.rateLimiter = new RateLimiter(
      this.config.rateLimitRequests,
      this.config.rateLimitWindow
    );
  }
}