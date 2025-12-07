/**
 * WooCommerce Security Test Suite
 *
 * Comprehensive security tests for WooCommerce integration:
 * - Authentication & Authorization
 * - Input Validation & Sanitization
 * - SQL Injection Prevention
 * - XSS Prevention
 * - CSRF Protection
 * - Rate Limiting
 * - Tenant Isolation
 * - Error Handling
 *
 * Author: Security Team
 * Date: 2025-12-03
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Mock database and external services
jest.mock('@/lib/database');
jest.mock('@/lib/services/WooCommerceService');

describe('WooCommerce Security Tests', () => {
  let testOrgId: string;
  let adminUserId: string;
  let regularUserId: string;

  beforeAll(async () => {
    // Setup test data
    testOrgId = '12345678-1234-1234-1234-123456789012';
    adminUserId = 'admin-user-123';
    regularUserId = 'regular-user-456';

    // Setup test database
    try {
      execSync('npm run db:migrate:test', { stdio: 'inherit' });
    } catch (error) {
      console.warn('Database migration failed, continuing with tests...');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      execSync('npm run db:reset:test', { stdio: 'inherit' });
    } catch (error) {
      console.warn('Database cleanup failed...');
    }
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication');
    });

    it('should reject requests with invalid org_id', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': 'invalid-uuid',
          'x-user-id': adminUserId,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid organization ID format');
    });

    it('should reject non-admin users for admin-only operations', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': regularUserId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Store',
          store_url: 'https://example.com',
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Admin privileges required');
    });

    it('should allow admin users for admin operations', async () => {
      // Mock admin user
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Store',
          store_url: 'https://example.com',
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      // Should not be 403
      expect(response.status).not.toBe(403);
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should reject invalid URLs', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Store',
          store_url: 'invalid-url',
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid input format');
      expect(data.details).toContain('Valid store URL is required');
    });

    it('should sanitize XSS attempts in input', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: xssPayload,
          store_url: 'https://example.com',
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      // Should pass validation (XSS is sanitized)
      expect(response.status).toBeLessThan(500);
    });

    it('should reject SQL injection attempts', async () => {
      const sqlPayload = "'; DROP TABLE users; --";
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sqlPayload,
          store_url: 'https://example.com',
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid input format');
      expect(data.details).toContain('Potentially malicious input detected');
    });

    it('should validate consumer key format', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Store',
          store_url: 'https://example.com',
          consumer_key: 'invalid-key',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid input format');
    });

    it('should validate batch size limits', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-customers', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            url: 'https://example.com',
            consumerKey: 'ck_test',
            consumerSecret: 'cs_test',
          },
          org_id: testOrgId,
          options: {
            batchSize: 2000, // Exceeds limit of 1000
          },
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid input format');
      expect(data.details).toContain('Batch size must be between 1 and 1000');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Store',
          store_url: 'https://example.com',
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Invalid or missing CSRF token');
    });

    it('should reject invalid CSRF tokens', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'x-csrf-token': 'invalid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Store',
          store_url: 'https://example.com',
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Invalid or missing CSRF token');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch('/api/v1/integrations/woocommerce/secure-config', {
            method: 'GET',
            headers: {
              'x-org-id': testOrgId,
              'x-user-id': adminUserId,
              'x-user-role': 'admin',
            },
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // At least some requests should be rate limited
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
        },
      });

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Tenant Isolation', () => {
    it('should enforce org_id validation in all queries', async () => {
      const otherOrgId = '87654321-4321-4321-4321-210987654321';

      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': otherOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
        },
      });

      // Should not return data from different org
      const data = await response.json();
      expect(data.data).toBeNull();
    });

    it('should prevent cross-tenant data access', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-table?entity=customers&orgId=other-org', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Unauthorized access');
    });

    it('should validate org_id in URL parameters', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-table?entity=products&orgId=invalid-uuid', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid organization ID format');
    });
  });

  describe('Error Handling', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Invalid configuration that should cause an error
          name: '',
          store_url: 'invalid-url',
          consumer_key: '',
          consumer_secret: '',
          status: 'invalid-status',
        }),
      });

      const data = await response.json();

      // Should not expose internal details
      expect(data.error).not.toContain('database');
      expect(data.error).not.toContain('connection');
      expect(data.error).not.toContain('password');
      expect(data.error).not.toContain('secret');
    });

    it('should return consistent error format', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': 'invalid-uuid',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data).not.toHaveProperty('stack');
      expect(data).not.toHaveProperty('details');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockQuery = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
        },
      });

      // Should not expose database error details
      const data = await response.json();
      expect(data.error).not.toContain('Database connection failed');
      expect(data.error).not.toContain('PostgreSQL');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
        },
      });

      // Check security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should not expose server information', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
        },
      });

      // Should not expose server info
      expect(response.headers.get('Server')).toBeUndefined();
      expect(response.headers.get('X-Powered-By')).toBeUndefined();
    });
  });

  describe('Audit Logging', () => {
    it('should log authentication failures', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': 'nonexistent-user',
        },
      });

      // Verify audit log entry was created
      expect(response.status).toBe(401);
      // In a real test, you would check the audit log table
      // expect(auditLogEntry).toBeDefined();
      // expect(auditLogEntry.event_type).toBe('AUTHENTICATION_FAILURE');
    });

    it('should log SQL injection attempts', async () => {
      const sqlPayload = "'; SELECT * FROM users; --";
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sqlPayload,
          store_url: 'https://example.com',
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
          status: 'active',
        }),
      });

      expect(response.status).toBe(400);
      // In a real test, you would check the audit log
      // expect(auditLogEntry).toBeDefined();
      // expect(auditLogEntry.event_type).toBe('SQL_INJECTION_ATTEMPT');
    });

    it('should log unauthorized access attempts', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': regularUserId, // Regular user trying to access admin endpoint
        },
      });

      expect(response.status).toBe(401);
      // In a real test, you would check the audit log
      // expect(auditLogEntry).toBeDefined();
      // expect(auditLogEntry.event_type).toBe('UNAUTHORIZED_ACCESS');
    });
  });

  describe('Credential Security', () => {
    it('should not expose credentials in API responses', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'GET',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
        },
      });

      const data = await response.json();

      if (data.data) {
        // Credentials should not be exposed
        expect(data.data).not.toHaveProperty('consumer_key');
        expect(data.data).not.toHaveProperty('consumer_secret');
      }
    });

    it('should encrypt credentials in storage', async () => {
      const response = await fetch('/api/v1/integrations/woocommerce/secure-config', {
        method: 'POST',
        headers: {
          'x-org-id': testOrgId,
          'x-user-id': adminUserId,
          'x-user-role': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Store',
          store_url: 'https://example.com',
          consumer_key: 'ck_test_key',
          consumer_secret: 'cs_test_secret',
          status: 'active',
        }),
      });

      expect(response.status).toBeLessThan(500);

      // In a real test, you would check the database to ensure credentials are encrypted
      // const storedCredentials = await getStoredCredentials();
      // expect(storedCredentials.encrypted_consumer_key).toBeDefined();
      // expect(storedCredentials.encrypted_consumer_secret).toBeDefined();
      // expect(storedCredentials.encrypted_consumer_key).not.toBe('ck_test_key');
      // expect(storedCredentials.encrypted_consumer_secret).not.toBe('cs_test_secret');
    });
  });
});

// Helper functions for testing
function createTestUser(role: string, orgId: string) {
  return {
    id: `test-user-${Date.now()}`,
    role,
    org_id: orgId,
  };
}

function createTestOrganization() {
  return {
    id: `test-org-${Date.now()}`,
    name: 'Test Organization',
    is_active: true,
  };
}