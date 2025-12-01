import {
  loadTester,
  performanceAssert,
  measurePerformance,
  memoryLeakDetector,
} from '../setup/performance.setup';
import { setupTestDatabase, teardownTestDatabase, resetTestData } from '../setup/database.setup';
import { InventoryItemFactory, createBulkUploadScenario } from '../fixtures/factories';

// Mock fetch for API testing
global.fetch = jest.fn();

describe('Performance Load Testing', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await resetTestData();
    jest.clearAllMocks();

    // Default successful API response
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
      status: 200,
    } as Response);
  });

  describe('API Endpoint Load Tests', () => {
    test('inventory list API should handle concurrent requests', async () => {
      const testFunction = async () => {
        const response = await fetch('/api/inventory?page=1&limit=20');
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        return response.json();
      };

      const result = await loadTester.runLoadTest(testFunction, {
        concurrent: 50,
        duration: 10, // 10 seconds
        rampUp: 2, // 2 seconds ramp-up
      });

      // Performance assertions
      performanceAssert.minRequestsPerSecond(result, 100); // At least 100 RPS
      performanceAssert.maxErrorRate(result, 1); // Less than 1% error rate
      expect(result.averageResponseTime).toBeLessThan(500); // 500ms average
      expect(result.p95ResponseTime).toBeLessThan(1000); // 1s for 95th percentile
      expect(result.p99ResponseTime).toBeLessThan(2000); // 2s for 99th percentile

      console.log('Inventory API Load Test Results:', {
        totalRequests: result.totalRequests,
        requestsPerSecond: result.requestsPerSecond,
        averageResponseTime: result.averageResponseTime,
        errorRate: result.errorRate,
      });
    });

    test('inventory creation API should handle burst traffic', async () => {
      let requestCount = 0;

      const testFunction = async () => {
        const item = InventoryItemFactory.build({
          sku: `LOAD-TEST-${++requestCount}`,
          organizationId: 'test-org-1',
        });

        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        if (!response.ok) {
          throw new Error(`Create API Error: ${response.status}`);
        }
        return response.json();
      };

      const result = await loadTester.runLoadTest(testFunction, {
        concurrent: 20,
        duration: 5,
        rampUp: 1,
      });

      // Creation endpoint is more resource intensive
      performanceAssert.minRequestsPerSecond(result, 50); // At least 50 RPS
      performanceAssert.maxErrorRate(result, 2); // Less than 2% error rate
      expect(result.averageResponseTime).toBeLessThan(1000); // 1s average
    });

    test('search API should maintain performance under load', async () => {
      const searchTerms = ['laptop', 'electronics', 'test', 'item', 'supply'];
      let searchIndex = 0;

      const testFunction = async () => {
        const term = searchTerms[searchIndex % searchTerms.length];
        searchIndex++;

        const response = await fetch(
          `/api/inventory?query=${encodeURIComponent(term)}&page=1&limit=10`
        );
        if (!response.ok) {
          throw new Error(`Search API Error: ${response.status}`);
        }
        return response.json();
      };

      const result = await loadTester.runLoadTest(testFunction, {
        concurrent: 30,
        duration: 8,
        rampUp: 2,
      });

      performanceAssert.minRequestsPerSecond(result, 80);
      performanceAssert.maxErrorRate(result, 1.5);
      expect(result.averageResponseTime).toBeLessThan(750);
    });

    test('bulk upload API should handle large files efficiently', async () => {
      // Create test XLSX data
      const largeDataset = createBulkUploadScenario(1000, false);

      const testFunction = async () => {
        const formData = new FormData();
        const file = new Blob([largeDataset], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        formData.append('file', file, 'bulk-test.xlsx');

        const response = await fetch('/api/v2/inventory/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload API Error: ${response.status}`);
        }
        return response.json();
      };

      // Test fewer concurrent uploads due to resource intensity
      const result = await loadTester.runLoadTest(testFunction, {
        concurrent: 5,
        duration: 10,
        rampUp: 3,
      });

      // More lenient performance requirements for bulk operations
      performanceAssert.minRequestsPerSecond(result, 5);
      performanceAssert.maxErrorRate(result, 5);
      expect(result.averageResponseTime).toBeLessThan(5000); // 5s for bulk operations
    });
  });

  describe('Database Performance Tests', () => {
    test('should handle concurrent database operations', async () => {
      const testFunction = async () => {
        // Simulate complex database query
        const mockQuery = new Promise(resolve => {
          setTimeout(() => resolve({ rows: [] }), Math.random() * 100);
        });

        return mockQuery;
      };

      const result = await loadTester.runLoadTest(testFunction, {
        concurrent: 100,
        duration: 5,
      });

      performanceAssert.minRequestsPerSecond(result, 200);
      expect(result.averageResponseTime).toBeLessThan(200);
    });

    test('should maintain performance with large result sets', async () => {
      // Mock database returning large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) =>
        InventoryItemFactory.build({ id: `perf-item-${i}` })
      );

      const testFunction = async () => {
        // Simulate processing large dataset
        const start = performance.now();

        // Simulate data processing
        const processed = largeDataset.slice(0, 100).map(item => ({
          ...item,
          totalValue: item.currentStock * item.unitCost,
        }));

        const duration = performance.now() - start;

        if (duration > 100) {
          throw new Error('Processing too slow');
        }

        return processed;
      };

      const result = await loadTester.runLoadTest(testFunction, {
        concurrent: 20,
        duration: 5,
      });

      performanceAssert.minRequestsPerSecond(result, 100);
      performanceAssert.maxErrorRate(result, 0);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not have memory leaks during sustained load', async () => {
      memoryLeakDetector.startMonitoring(500); // Monitor every 500ms

      const testFunction = async () => {
        // Create and process temporary data
        const tempData = Array.from({ length: 1000 }, () => InventoryItemFactory.build());

        // Simulate processing
        return tempData.reduce((sum, item) => sum + item.unitCost, 0);
      };

      // Run sustained load
      await loadTester.runLoadTest(testFunction, {
        concurrent: 10,
        duration: 10,
      });

      memoryLeakDetector.stopMonitoring();

      const leakResults = memoryLeakDetector.detectLeaks();

      expect(leakResults.hasLeak).toBeFalsy();
      expect(leakResults.avgHeapIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB avg increase
      expect(leakResults.maxHeapIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max increase

      console.log('Memory Leak Detection Results:', leakResults);
    });

    test('should handle large file processing without excessive memory usage', async () => {
      const initialMemory = process.memoryUsage();

      const { result, metrics } = await measurePerformance(
        async () => {
          // Simulate processing large XLSX file
          const largeFile = createBulkUploadScenario(5000, false);

          // Simulate streaming processing (chunks)
          const chunkSize = 100;
          const chunks = Math.ceil(5000 / chunkSize);

          for (let i = 0; i < chunks; i++) {
            // Simulate processing chunk
            const chunkData = Array.from({ length: chunkSize }, (_, j) =>
              InventoryItemFactory.build({ id: `chunk-${i}-${j}` })
            );

            // Process chunk (simulate validation, transformation)
            chunkData.forEach(item => {
              item.totalValue = item.currentStock * item.unitCost;
            });

            // Yield to event loop
            await new Promise(resolve => setImmediate(resolve));
          }

          return { processed: 5000 };
        },
        { maxMemory: 100 * 1024 * 1024 }
      ); // 100MB limit

      expect(result.processed).toBe(5000);
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024);

      // Verify memory is released
      global.gc?.(); // Force garbage collection if available
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB max permanent increase
    });
  });

  describe('Frontend Performance Simulation', () => {
    test('should handle rapid table updates efficiently', async () => {
      let updateCount = 0;

      const testFunction = async () => {
        // Simulate React table re-render
        updateCount++;

        const startTime = performance.now();

        // Simulate virtual DOM updates
        const items = Array.from({ length: 100 }, (_, i) =>
          InventoryItemFactory.build({ id: `table-item-${i}-${updateCount}` })
        );

        // Simulate sorting/filtering
        items.sort((a, b) => a.name.localeCompare(b.name));

        // Simulate rendering time
        const renderTime = performance.now() - startTime;

        if (renderTime > 50) {
          // 50ms budget for 100 items
          throw new Error('Render time exceeded budget');
        }

        return items;
      };

      const result = await loadTester.runLoadTest(testFunction, {
        concurrent: 1, // Single threaded like React
        duration: 5,
      });

      // Should maintain 60fps (16.67ms per frame)
      expect(result.averageResponseTime).toBeLessThan(16);
      performanceAssert.maxErrorRate(result, 0);
    });

    test('should handle search input debouncing efficiently', async () => {
      const searchQueries = [
        'a',
        'ap',
        'app',
        'appl',
        'apple',
        'apple ',
        'apple l',
        'apple la',
        'apple lap',
        'apple laptop',
      ];
      let queryIndex = 0;

      const testFunction = async () => {
        const query = searchQueries[queryIndex % searchQueries.length];
        queryIndex++;

        // Simulate debounced search
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms debounce

        // Simulate API call
        const mockResponse = {
          data: Array.from({ length: Math.min(10, query.length * 2) }, (_, i) =>
            InventoryItemFactory.build({ name: `${query} item ${i}` })
          ),
        };

        return mockResponse;
      };

      const result = await loadTester.runLoadTest(testFunction, {
        concurrent: 1,
        duration: 3,
      });

      // Debounced search should be responsive
      expect(result.averageResponseTime).toBeLessThan(100);
    });
  });

  describe('Stress Testing', () => {
    test('should gracefully degrade under extreme load', async () => {
      let errorThreshold = false;

      const testFunction = async () => {
        // Simulate resource-intensive operation
        const startTime = performance.now();

        // Create stress by consuming CPU
        let iterations = 0;
        while (performance.now() - startTime < 10 && iterations < 100000) {
          Math.random(); // Light CPU work
          iterations++;
        }

        // Simulate failures under extreme load
        if (Math.random() < 0.1 && errorThreshold) {
          throw new Error('Service temporarily unavailable');
        }

        return { iterations };
      };

      // Start with normal load
      const normalResult = await loadTester.runLoadTest(testFunction, {
        concurrent: 10,
        duration: 2,
      });

      // Increase to stress load
      errorThreshold = true;
      const stressResult = await loadTester.runLoadTest(testFunction, {
        concurrent: 100,
        duration: 5,
      });

      // Under stress, some degradation is acceptable
      expect(stressResult.errorRate).toBeLessThan(20); // 20% error rate acceptable under stress
      expect(stressResult.requestsPerSecond).toBeGreaterThan(normalResult.requestsPerSecond * 0.3); // At least 30% of normal throughput

      console.log('Stress Test Results:', {
        normal: {
          rps: normalResult.requestsPerSecond,
          errors: normalResult.errorRate,
        },
        stress: {
          rps: stressResult.requestsPerSecond,
          errors: stressResult.errorRate,
        },
      });
    });

    test('should recover after stress conditions', async () => {
      // Simulate stress condition
      const stressFunction = async () => {
        // Heavy operation
        await new Promise(resolve => setTimeout(resolve, 100));

        if (Math.random() < 0.3) {
          throw new Error('Stress-induced failure');
        }

        return { status: 'stress' };
      };

      // Apply stress
      const stressResult = await loadTester.runLoadTest(stressFunction, {
        concurrent: 50,
        duration: 3,
      });

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test normal operation after stress
      const recoveryFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'recovered' };
      };

      const recoveryResult = await loadTester.runLoadTest(recoveryFunction, {
        concurrent: 10,
        duration: 2,
      });

      // System should recover to normal performance
      expect(recoveryResult.errorRate).toBeLessThan(1);
      expect(recoveryResult.averageResponseTime).toBeLessThan(50);
      expect(recoveryResult.requestsPerSecond).toBeGreaterThan(stressResult.requestsPerSecond);
    });
  });

  describe('Resource Monitoring', () => {
    test('should monitor and report resource usage', async () => {
      const initialUsage = process.resourceUsage();
      const initialMemory = process.memoryUsage();

      const { result, metrics } = await measurePerformance(async () => {
        // Simulate resource-intensive operation
        const data = Array.from({ length: 10000 }, () => InventoryItemFactory.build());

        // CPU-intensive processing
        const processed = data.map(item => ({
          ...item,
          hash: item.sku.split('').reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0),
        }));

        return processed;
      });

      const finalUsage = process.resourceUsage();
      const finalMemory = process.memoryUsage();

      // Calculate resource deltas
      const cpuTime =
        finalUsage.userCPUTime +
        finalUsage.systemCPUTime -
        (initialUsage.userCPUTime + initialUsage.systemCPUTime);

      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log('Resource Usage:', {
        duration: metrics.duration,
        cpuTime: cpuTime / 1000, // Convert to milliseconds
        memoryDelta: memoryDelta / (1024 * 1024), // Convert to MB
        processedItems: result.length,
      });

      // Resource usage should be reasonable
      expect(cpuTime).toBeLessThan(1000000); // 1 second CPU time
      expect(memoryDelta).toBeLessThan(100 * 1024 * 1024); // 100MB memory increase
    });
  });
});
