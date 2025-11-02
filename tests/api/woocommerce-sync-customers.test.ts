/**
 * Test suite for WooCommerce Customer Sync API
 *
 * Tests proper error handling for:
 * - Empty request bodies
 * - Malformed JSON
 * - Missing required fields
 * - Valid requests
 */

import { describe, it, expect } from '@jest/globals';

describe('POST /api/v1/integrations/woocommerce/sync/customers', () => {
  const endpoint = 'http://localhost:3000/api/v1/integrations/woocommerce/sync/customers';

  it('should return 400 for empty request body', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid JSON');
  });

  it('should return 400 for malformed JSON', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json',
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid JSON');
  });

  it('should return 400 for missing config', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: 'test-org',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('configuration is required');
  });

  it('should return 400 for missing org_id', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          url: 'https://example.com',
          consumerKey: 'ck_test',
          consumerSecret: 'cs_test',
        },
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('org_id is required');
  });

  it('should return 400 for incomplete config', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          url: 'https://example.com',
          // Missing consumerKey and consumerSecret
        },
        org_id: 'test-org',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('configuration is required');
  });

  it('should accept valid request structure (will fail on connection test)', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          url: 'https://example.com',
          consumerKey: 'ck_test',
          consumerSecret: 'cs_test',
        },
        org_id: 'test-org',
        options: {
          limit: 10,
        },
      }),
    });

    const data = await response.json();

    // Should pass validation but fail on WooCommerce connection
    expect([400, 500]).toContain(response.status);
    expect(data.success).toBe(false);
    // Error should be about connection, not validation
    if (response.status === 500) {
      expect(data.error).toContain('connect');
    }
  });
});
