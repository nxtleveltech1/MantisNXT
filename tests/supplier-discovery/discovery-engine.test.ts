/**
 * Tests for Supplier Discovery Engine
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { supplierDiscoveryEngine } from '@/lib/supplier-discovery/engine';
import { supplierCache } from '@/lib/supplier-discovery/cache';
import { SupplierDiscoveryRequest, DiscoveredSupplierData } from '@/lib/supplier-discovery/types';

// Mock the external dependencies
jest.mock('@/lib/supplier-discovery/extractors');
jest.mock('@/lib/supplier-discovery/processor');

describe('SupplierDiscoveryEngine', () => {
  beforeEach(async () => {
    // Clear cache before each test
    supplierCache.clear();

    // Reset any mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await supplierDiscoveryEngine.cleanup();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(supplierDiscoveryEngine.initialize()).resolves.not.toThrow();
    });

    it('should handle multiple initialization calls', async () => {
      await supplierDiscoveryEngine.initialize();
      await expect(supplierDiscoveryEngine.initialize()).resolves.not.toThrow();
    });
  });

  describe('supplier discovery', () => {
    const mockRequest: SupplierDiscoveryRequest = {
      supplierName: 'Test Company Ltd',
      additionalContext: {
        industry: 'Technology',
        region: 'Gauteng'
      }
    };

    const mockDiscoveredData: DiscoveredSupplierData = {
      supplierName: 'Test Company Ltd',
      registrationNumber: '2023/123456/07',
      address: {
        street: '123 Test Street',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2001',
        country: 'South Africa'
      },
      contactInfo: {
        phone: '+27 11 123 4567',
        email: 'info@testcompany.co.za',
        website: 'https://testcompany.co.za'
      },
      businessInfo: {
        industry: 'Technology',
        establishedDate: '2023',
        employeeCount: 50,
        annualRevenue: 10000000
      },
      compliance: {
        vatNumber: '4123456789',
        beeRating: 'Level 4',
        certifications: ['ISO 9001']
      },
      confidence: {
        overall: 0.85,
        individual: {
          companyName: 0.9,
          address: 0.8,
          contactInfo: 0.85
        }
      },
      sources: ['https://example.com', 'https://directory.com'],
      discoveredAt: new Date()
    };

    it('should validate request input', async () => {
      const invalidRequest = { supplierName: '' };

      const result = await supplierDiscoveryEngine.discoverSupplier(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid request');
    });

    it('should return cached data when available', async () => {
      // Pre-populate cache
      supplierCache.set(mockRequest.supplierName, mockDiscoveredData, mockRequest.additionalContext);

      const result = await supplierDiscoveryEngine.discoverSupplier(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data?.supplierName).toBe(mockRequest.supplierName);
    });

    it('should handle discovery failure gracefully', async () => {
      // Mock extraction to return empty results
      const { dataExtractor } = require('@/lib/supplier-discovery/extractors');
      dataExtractor.extractSupplierData = jest.fn().mockResolvedValue([]);

      const result = await supplierDiscoveryEngine.discoverSupplier(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No data found');
    });

    it('should cache successful discoveries', async () => {
      // Mock successful extraction and processing
      const { dataExtractor } = require('@/lib/supplier-discovery/extractors');
      const { dataProcessor } = require('@/lib/supplier-discovery/processor');

      dataExtractor.extractSupplierData = jest.fn().mockResolvedValue([
        { field: 'companyName', value: 'Test Company', confidence: 0.9, source: 'test', timestamp: new Date() }
      ]);
      dataProcessor.processExtractionResults = jest.fn().mockResolvedValue(mockDiscoveredData);

      const result = await supplierDiscoveryEngine.discoverSupplier(mockRequest);

      expect(result.success).toBe(true);
      expect(supplierCache.has(mockRequest.supplierName, mockRequest.additionalContext)).toBe(true);
    });
  });

  describe('bulk discovery', () => {
    it('should handle multiple supplier requests', async () => {
      const requests: SupplierDiscoveryRequest[] = [
        { supplierName: 'Company A' },
        { supplierName: 'Company B' },
        { supplierName: 'Company C' }
      ];

      const results = await supplierDiscoveryEngine.discoverMultipleSuppliers(requests);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.hasOwnProperty('success'))).toBe(true);
    });

    it('should handle batch processing with some failures', async () => {
      const requests: SupplierDiscoveryRequest[] = [
        { supplierName: 'Valid Company' },
        { supplierName: '' }, // Invalid request
        { supplierName: 'Another Valid Company' }
      ];

      const results = await supplierDiscoveryEngine.discoverMultipleSuppliers(requests);

      expect(results).toHaveLength(3);
      expect(results[1].success).toBe(false); // Middle request should fail
    });
  });

  describe('data refresh', () => {
    const mockRequest: SupplierDiscoveryRequest = {
      supplierName: 'Refresh Test Company'
    };

    it('should clear cache and perform fresh discovery', async () => {
      // Pre-populate cache
      const oldData = { ...mockDiscoveredData, supplierName: 'Refresh Test Company' };
      supplierCache.set(mockRequest.supplierName, oldData);

      expect(supplierCache.has(mockRequest.supplierName)).toBe(true);

      await supplierDiscoveryEngine.refreshSupplierData(mockRequest.supplierName);

      // Cache should be cleared and new discovery attempted
      expect(supplierCache.has(mockRequest.supplierName)).toBe(false);
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const health = await supplierDiscoveryEngine.healthCheck();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('details');
      expect(typeof health.healthy).toBe('boolean');
    });

    it('should include system statistics', async () => {
      const health = await supplierDiscoveryEngine.healthCheck();

      expect(health.details).toHaveProperty('initialized');
      expect(health.details).toHaveProperty('activeRequests');
      expect(health.details).toHaveProperty('cacheSize');
    });
  });

  describe('rate limiting', () => {
    it('should handle concurrent request limits', async () => {
      const requests = Array(10).fill(0).map((_, i) => ({
        supplierName: `Concurrent Company ${i}`
      }));

      // Fire multiple requests simultaneously
      const promises = requests.map(req =>
        supplierDiscoveryEngine.discoverSupplier(req)
      );

      const results = await Promise.all(promises);

      // All requests should complete (either success or controlled failure)
      expect(results).toHaveLength(10);
      expect(results.every(r => r.hasOwnProperty('success'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle extraction errors gracefully', async () => {
      const { dataExtractor } = require('@/lib/supplier-discovery/extractors');
      dataExtractor.extractSupplierData = jest.fn().mockRejectedValue(new Error('Extraction failed'));

      const result = await supplierDiscoveryEngine.discoverSupplier({
        supplierName: 'Error Test Company'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Extraction failed');
    });

    it('should handle processing errors gracefully', async () => {
      const { dataExtractor } = require('@/lib/supplier-discovery/extractors');
      const { dataProcessor } = require('@/lib/supplier-discovery/processor');

      dataExtractor.extractSupplierData = jest.fn().mockResolvedValue([
        { field: 'test', value: 'test', confidence: 0.5, source: 'test', timestamp: new Date() }
      ]);
      dataProcessor.processExtractionResults = jest.fn().mockRejectedValue(new Error('Processing failed'));

      const result = await supplierDiscoveryEngine.discoverSupplier({
        supplierName: 'Processing Error Company'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Processing failed');
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide accurate statistics', () => {
      const stats = supplierDiscoveryEngine.getStatistics();

      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('activeRequests');
      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('isInitialized');
    });

    it('should track processing times', async () => {
      const startTime = Date.now();

      const result = await supplierDiscoveryEngine.discoverSupplier({
        supplierName: 'Timing Test Company'
      });

      const endTime = Date.now();

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThanOrEqual(endTime - startTime);
    });
  });
});