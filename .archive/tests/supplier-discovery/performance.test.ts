/**
 * Performance tests for Supplier Discovery System
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { supplierDiscoveryEngine } from '@/lib/supplier-discovery/engine';
import { supplierCache } from '@/lib/supplier-discovery/cache';
import { SupplierDiscoveryRequest } from '@/lib/supplier-discovery/types';

describe('Supplier Discovery Performance Tests', () => {
  beforeAll(async () => {
    await supplierDiscoveryEngine.initialize();
  });

  afterAll(async () => {
    await supplierDiscoveryEngine.cleanup();
  });

  describe('Response Time Requirements', () => {
    it('should respond to basic discovery requests within 3 seconds', async () => {
      const startTime = Date.now();

      const request: SupplierDiscoveryRequest = {
        supplierName: 'Performance Test Company',
      };

      const result = await supplierDiscoveryEngine.discoverSupplier(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(3000); // 3 seconds
      expect(result.processingTime).toBeLessThan(3000);
    }, 10000); // 10 second timeout for test

    it('should respond to cached requests within 100ms', async () => {
      const request: SupplierDiscoveryRequest = {
        supplierName: 'Cached Test Company',
      };

      // Prime the cache
      await supplierDiscoveryEngine.discoverSupplier(request);

      const startTime = Date.now();
      const result = await supplierDiscoveryEngine.discoverSupplier(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // 100ms
      expect(result.processingTime).toBeLessThan(100);
    });
  });

  describe('Throughput Requirements', () => {
    it('should handle 10 concurrent requests efficiently', async () => {
      const startTime = Date.now();

      const requests = Array(10)
        .fill(0)
        .map((_, i) => ({
          supplierName: `Concurrent Company ${i}`,
        }));

      const promises = requests.map(req => supplierDiscoveryEngine.discoverSupplier(req));

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete
      expect(results).toHaveLength(10);

      // Total time should be reasonable (not 10x single request time)
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 10 requests

      // Average response time should be acceptable
      const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      expect(avgTime).toBeLessThan(5000); // 5 seconds average
    }, 15000); // 15 second timeout

    it('should handle bulk discovery efficiently', async () => {
      const startTime = Date.now();

      const requests: SupplierDiscoveryRequest[] = Array(5)
        .fill(0)
        .map((_, i) => ({
          supplierName: `Bulk Company ${i}`,
        }));

      const results = await supplierDiscoveryEngine.discoverMultipleSuppliers(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 5 bulk requests
    }, 20000); // 20 second timeout
  });

  describe('Cache Performance', () => {
    it('should demonstrate significant cache performance improvement', async () => {
      const request: SupplierDiscoveryRequest = {
        supplierName: 'Cache Performance Test Company',
      };

      // Clear cache to ensure fresh request
      supplierCache.clear();

      // First request (uncached)
      const startTime1 = Date.now();
      await supplierDiscoveryEngine.discoverSupplier(request);
      const uncachedTime = Date.now() - startTime1;

      // Second request (cached)
      const startTime2 = Date.now();
      await supplierDiscoveryEngine.discoverSupplier(request);
      const cachedTime = Date.now() - startTime2;

      // Cached request should be significantly faster
      expect(cachedTime).toBeLessThan(uncachedTime * 0.1); // At least 10x faster
      expect(cachedTime).toBeLessThan(100); // Less than 100ms
    });

    it('should maintain cache hit rate above 80% under typical load', async () => {
      supplierCache.clear();

      const companies = ['Company A', 'Company B', 'Company C', 'Company D', 'Company E'];

      // Simulate typical usage pattern with some repeated requests
      const requests: SupplierDiscoveryRequest[] = [];

      // Initial requests
      companies.forEach(name => {
        requests.push({ supplierName: name });
      });

      // Repeated requests (simulating users accessing same data)
      companies.forEach(name => {
        requests.push({ supplierName: name }); // 100% cache hit expected
        requests.push({ supplierName: name }); // 100% cache hit expected
      });

      // Execute all requests
      for (const request of requests) {
        await supplierDiscoveryEngine.discoverSupplier(request);
      }

      const stats = supplierCache.getStats();
      const hitRate = stats.hitRate || 0;

      expect(hitRate).toBeGreaterThan(80); // Above 80% hit rate
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many requests
      for (let i = 0; i < 50; i++) {
        await supplierDiscoveryEngine.discoverSupplier({
          supplierName: `Memory Test Company ${i % 10}`, // Cycle through 10 companies
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting gracefully without blocking', async () => {
      const startTime = Date.now();

      // Create more requests than the concurrent limit
      const requests = Array(20)
        .fill(0)
        .map((_, i) => ({
          supplierName: `Rate Limit Test ${i}`,
        }));

      const promises = requests.map(req => supplierDiscoveryEngine.discoverSupplier(req));

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete
      expect(results).toHaveLength(20);

      // Should complete in reasonable time even with rate limiting
      expect(totalTime).toBeLessThan(30000); // 30 seconds

      // No requests should fail due to rate limiting
      const failures = results.filter(r => !r.success && r.error?.includes('rate limit'));
      expect(failures).toHaveLength(0);
    }, 35000); // 35 second timeout
  });

  describe('Data Processing Performance', () => {
    it('should process extraction results efficiently', async () => {
      const { dataProcessor } = require('@/lib/supplier-discovery/processor');

      // Create large extraction result set
      const extractionResults = Array(1000)
        .fill(0)
        .map((_, i) => ({
          field: `field_${i % 10}`,
          value: `value_${i}`,
          confidence: Math.random(),
          source: `source_${i % 5}`,
          timestamp: new Date(),
        }));

      const startTime = Date.now();
      const result = await dataProcessor.processExtractionResults(extractionResults);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Less than 1 second
      expect(result).toBeTruthy();
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain performance with large cache', async () => {
      // Fill cache with many entries
      for (let i = 0; i < 100; i++) {
        await supplierDiscoveryEngine.discoverSupplier({
          supplierName: `Scale Test Company ${i}`,
        });
      }

      // Test performance with large cache
      const startTime = Date.now();
      await supplierDiscoveryEngine.discoverSupplier({
        supplierName: 'Scale Test Company 50', // Should be cached
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // Should still be fast with large cache
    });

    it('should handle cache cleanup efficiently', async () => {
      // Fill cache to near capacity
      for (let i = 0; i < 900; i++) {
        await supplierDiscoveryEngine.discoverSupplier({
          supplierName: `Cleanup Test Company ${i}`,
        });
      }

      const startTime = Date.now();
      supplierCache.clear();
      const endTime = Date.now();
      const cleanupTime = endTime - startTime;

      expect(cleanupTime).toBeLessThan(100); // Cleanup should be fast
      expect(supplierCache.size()).toBe(0);
    });
  });
});
