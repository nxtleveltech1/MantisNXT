/**
 * Integration tests for Supplier Discovery API Routes
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST, PUT, PATCH } from '@/app/api/suppliers/discovery/route';
import { GET as HealthGET } from '@/app/api/suppliers/discovery/health/route';

// Mock the discovery engine
jest.mock('@/lib/supplier-discovery/engine');

describe('Supplier Discovery API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/suppliers/discovery', () => {
    it('should handle valid discovery requests', async () => {
      const { supplierDiscoveryEngine } = require('@/lib/supplier-discovery/engine');
      supplierDiscoveryEngine.initialize = jest.fn().mockResolvedValue(undefined);
      supplierDiscoveryEngine.discoverSupplier = jest.fn().mockResolvedValue({
        success: true,
        data: {
          supplierName: 'Test Company',
          registrationNumber: '2023/123456/07',
          address: {
            street: '123 Test St',
            city: 'Johannesburg',
            province: 'Gauteng',
            postalCode: '2001',
            country: 'South Africa',
          },
          contactInfo: {
            phone: '+27 11 123 4567',
            email: 'test@company.com',
            website: 'https://testcompany.com',
          },
          businessInfo: {
            industry: 'Technology',
            establishedDate: '2023',
            employeeCount: 50,
            annualRevenue: 1000000,
          },
          compliance: {
            vatNumber: '4123456789',
            beeRating: 'Level 4',
            certifications: [],
          },
          confidence: {
            overall: 0.85,
            individual: {},
          },
          sources: ['test-source'],
          discoveredAt: new Date(),
        },
        processingTime: 1500,
        sourcesUsed: ['test-source'],
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'POST',
        body: JSON.stringify({
          supplierName: 'Test Company',
          additionalContext: {
            industry: 'Technology',
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.supplierName).toBe('Test Company');
      expect(data.metadata).toHaveProperty('processingTime');
      expect(data.metadata).toHaveProperty('confidence');
    });

    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'POST',
        body: JSON.stringify({
          supplierName: '', // Invalid - too short
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeInstanceOf(Array);
    });

    it('should handle discovery failures', async () => {
      const { supplierDiscoveryEngine } = require('@/lib/supplier-discovery/engine');
      supplierDiscoveryEngine.initialize = jest.fn().mockResolvedValue(undefined);
      supplierDiscoveryEngine.discoverSupplier = jest.fn().mockResolvedValue({
        success: false,
        error: 'No data found for the specified supplier',
        processingTime: 1000,
        sourcesUsed: [],
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'POST',
        body: JSON.stringify({
          supplierName: 'Nonexistent Company',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No data found for the specified supplier');
    });

    it('should handle internal server errors', async () => {
      const { supplierDiscoveryEngine } = require('@/lib/supplier-discovery/engine');
      supplierDiscoveryEngine.initialize = jest
        .fn()
        .mockRejectedValue(new Error('Initialization failed'));

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'POST',
        body: JSON.stringify({
          supplierName: 'Test Company',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('PUT /api/suppliers/discovery (Bulk)', () => {
    it('should handle bulk discovery requests', async () => {
      const { supplierDiscoveryEngine } = require('@/lib/supplier-discovery/engine');
      supplierDiscoveryEngine.initialize = jest.fn().mockResolvedValue(undefined);
      supplierDiscoveryEngine.discoverMultipleSuppliers = jest.fn().mockResolvedValue([
        {
          success: true,
          data: { supplierName: 'Company A' },
          processingTime: 1000,
          sourcesUsed: ['source1'],
        },
        {
          success: false,
          error: 'Company not found',
          processingTime: 500,
          sourcesUsed: [],
        },
        {
          success: true,
          data: { supplierName: 'Company C' },
          processingTime: 1200,
          sourcesUsed: ['source2'],
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'PUT',
        body: JSON.stringify({
          suppliers: [
            { supplierName: 'Company A' },
            { supplierName: 'Company B' },
            { supplierName: 'Company C' },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(data.metadata.totalRequests).toBe(3);
      expect(data.metadata.successful).toBe(2);
      expect(data.metadata.failed).toBe(1);
    });

    it('should validate bulk request limits', async () => {
      const suppliers = Array(15)
        .fill(0)
        .map((_, i) => ({
          supplierName: `Company ${i}`,
        }));

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'PUT',
        body: JSON.stringify({ suppliers }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('PATCH /api/suppliers/discovery (Refresh)', () => {
    it('should handle refresh requests', async () => {
      const { supplierDiscoveryEngine } = require('@/lib/supplier-discovery/engine');
      supplierDiscoveryEngine.initialize = jest.fn().mockResolvedValue(undefined);
      supplierDiscoveryEngine.refreshSupplierData = jest.fn().mockResolvedValue({
        success: true,
        data: {
          supplierName: 'Refreshed Company',
          confidence: { overall: 0.9 },
        },
        processingTime: 2000,
        sourcesUsed: ['fresh-source'],
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'PATCH',
        body: JSON.stringify({
          supplierName: 'Refreshed Company',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.supplierName).toBe('Refreshed Company');
      expect(data.metadata.refreshed).toBe(true);
    });
  });

  describe('GET /api/suppliers/discovery/health', () => {
    it('should return system health status', async () => {
      const { supplierDiscoveryEngine } = require('@/lib/supplier-discovery/engine');
      supplierDiscoveryEngine.healthCheck = jest.fn().mockResolvedValue({
        healthy: true,
        details: {
          initialized: true,
          activeRequests: 0,
          cacheSize: 5,
        },
      });
      supplierDiscoveryEngine.getStatistics = jest.fn().mockReturnValue({
        cacheStats: { keys: 5, hitRate: 75 },
        activeRequests: 0,
        queueLength: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery/health');

      const response = await HealthGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.system.initialized).toBe(true);
      expect(data.statistics).toHaveProperty('cacheStats');
    });

    it('should return unhealthy status when system has issues', async () => {
      const { supplierDiscoveryEngine } = require('@/lib/supplier-discovery/engine');
      supplierDiscoveryEngine.healthCheck = jest.fn().mockResolvedValue({
        healthy: false,
        details: {
          initialized: false,
          error: 'Initialization failed',
        },
      });
      supplierDiscoveryEngine.getStatistics = jest.fn().mockReturnValue({
        activeRequests: 0,
        queueLength: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery/health');

      const response = await HealthGET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.system.error).toBe('Initialization failed');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Response format validation', () => {
    it('should return consistent response structure for successful requests', async () => {
      const { supplierDiscoveryEngine } = require('@/lib/supplier-discovery/engine');
      supplierDiscoveryEngine.initialize = jest.fn().mockResolvedValue(undefined);
      supplierDiscoveryEngine.discoverSupplier = jest.fn().mockResolvedValue({
        success: true,
        data: {
          supplierName: 'Format Test Company',
          confidence: { overall: 0.8 },
        },
        processingTime: 1000,
        sourcesUsed: ['test'],
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'POST',
        body: JSON.stringify({ supplierName: 'Format Test Company' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('message');
      expect(data.metadata).toHaveProperty('processingTime');
      expect(data.metadata).toHaveProperty('sourcesUsed');
      expect(data.metadata).toHaveProperty('confidence');
    });

    it('should return consistent error response structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/discovery', {
        method: 'POST',
        body: JSON.stringify({ supplierName: 'x' }), // Too short
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(data.success).toBe(false);
    });
  });
});
