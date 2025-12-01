import { performance } from 'perf_hooks';

// Performance testing utilities and metrics collection
export interface PerformanceMetrics {
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  gcCount?: number;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  memoryPeak: number;
}

export interface DatabasePerformanceResult {
  queryCount: number;
  totalQueryTime: number;
  averageQueryTime: number;
  slowestQuery: { sql: string; duration: number };
  fastestQuery: { sql: string; duration: number };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;
  private startMemory: NodeJS.MemoryUsage = process.memoryUsage();
  private startCpuUsage: NodeJS.CpuUsage = process.cpuUsage();
  private gcCount: number = 0;

  constructor() {
    // Monitor garbage collection
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        this.gcCount++;
        return originalGC();
      };
    }
  }

  start(): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.startCpuUsage = process.cpuUsage();
    this.gcCount = 0;
  }

  stop(): PerformanceMetrics {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const endCpuUsage = process.cpuUsage(this.startCpuUsage);

    const metric: PerformanceMetrics = {
      duration: endTime - this.startTime,
      memoryUsage: {
        rss: endMemory.rss - this.startMemory.rss,
        heapTotal: endMemory.heapTotal - this.startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - this.startMemory.heapUsed,
        external: endMemory.external - this.startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - this.startMemory.arrayBuffers,
      },
      gcCount: this.gcCount,
      cpuUsage: endCpuUsage,
    };

    this.metrics.push(metric);
    return metric;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }

  // Get statistics from collected metrics
  getStatistics(): {
    average: number;
    median: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } {
    if (this.metrics.length === 0) {
      return { average: 0, median: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const durations = this.metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      average: sum / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      min: durations[0],
      max: durations[durations.length - 1],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
    };
  }
}

// Load testing utilities
export class LoadTester {
  private results: number[] = [];
  private errors: Error[] = [];
  private startTime: number = 0;

  async runLoadTest<T>(
    testFunction: () => Promise<T>,
    options: {
      concurrent: number;
      duration: number; // seconds
      rampUp?: number; // seconds
    }
  ): Promise<LoadTestResult> {
    const { concurrent, duration, rampUp = 0 } = options;
    this.results = [];
    this.errors = [];
    this.startTime = performance.now();

    const endTime = this.startTime + duration * 1000;
    const workers: Promise<void>[] = [];

    // Calculate delay between starting workers during ramp-up
    const rampUpDelayMs = rampUp > 0 ? (rampUp * 1000) / concurrent : 0;

    for (let i = 0; i < concurrent; i++) {
      const startDelay = rampUpDelayMs * i;
      workers.push(this.runWorker(testFunction, endTime, startDelay));
    }

    await Promise.all(workers);

    return this.calculateResults(duration);
  }

  private async runWorker<T>(
    testFunction: () => Promise<T>,
    endTime: number,
    startDelay: number
  ): Promise<void> {
    // Wait for ramp-up delay
    if (startDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, startDelay));
    }

    while (performance.now() < endTime) {
      const requestStart = performance.now();
      try {
        await testFunction();
        this.results.push(performance.now() - requestStart);
      } catch (error) {
        this.errors.push(error as Error);
        this.results.push(performance.now() - requestStart); // Still record timing
      }
    }
  }

  private calculateResults(duration: number): LoadTestResult {
    const totalRequests = this.results.length;
    const successfulRequests = totalRequests - this.errors.length;
    const failedRequests = this.errors.length;

    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        memoryPeak: process.memoryUsage().heapUsed,
      };
    }

    const sortedResults = [...this.results].sort((a, b) => a - b);
    const sum = this.results.reduce((a, b) => a + b, 0);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: sum / totalRequests,
      medianResponseTime: sortedResults[Math.floor(sortedResults.length / 2)],
      p95ResponseTime: sortedResults[Math.floor(sortedResults.length * 0.95)],
      p99ResponseTime: sortedResults[Math.floor(sortedResults.length * 0.99)],
      requestsPerSecond: totalRequests / duration,
      errorRate: (failedRequests / totalRequests) * 100,
      memoryPeak: process.memoryUsage().heapUsed,
    };
  }
}

// Database performance monitoring
export class DatabasePerformanceMonitor {
  private queries: Array<{ sql: string; duration: number; timestamp: number }> = [];

  recordQuery(sql: string, duration: number): void {
    this.queries.push({
      sql: sql.trim(),
      duration,
      timestamp: performance.now(),
    });
  }

  getResults(): DatabasePerformanceResult {
    if (this.queries.length === 0) {
      return {
        queryCount: 0,
        totalQueryTime: 0,
        averageQueryTime: 0,
        slowestQuery: { sql: '', duration: 0 },
        fastestQuery: { sql: '', duration: 0 },
      };
    }

    const totalQueryTime = this.queries.reduce((sum, q) => sum + q.duration, 0);
    const sortedByDuration = [...this.queries].sort((a, b) => a.duration - b.duration);

    return {
      queryCount: this.queries.length,
      totalQueryTime,
      averageQueryTime: totalQueryTime / this.queries.length,
      slowestQuery: {
        sql: sortedByDuration[sortedByDuration.length - 1].sql,
        duration: sortedByDuration[sortedByDuration.length - 1].duration,
      },
      fastestQuery: {
        sql: sortedByDuration[0].sql,
        duration: sortedByDuration[0].duration,
      },
    };
  }

  clear(): void {
    this.queries = [];
  }

  // Create a wrapper for database client that records performance
  wrapClient(client: any): any {
    const originalQuery = client.query.bind(client);

    client.query = async (...args: any[]) => {
      const start = performance.now();
      try {
        const result = await originalQuery(...args);
        this.recordQuery(args[0], performance.now() - start);
        return result;
      } catch (error) {
        this.recordQuery(args[0], performance.now() - start);
        throw error;
      }
    };

    return client;
  }
}

// Memory leak detection
export class MemoryLeakDetector {
  private baseline: NodeJS.MemoryUsage;
  private samples: NodeJS.MemoryUsage[] = [];
  private sampleInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.baseline = process.memoryUsage();
  }

  startMonitoring(intervalMs: number = 1000): void {
    this.samples = [];
    this.sampleInterval = setInterval(() => {
      this.samples.push(process.memoryUsage());
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
  }

  detectLeaks(): {
    hasLeak: boolean;
    trend: 'increasing' | 'stable' | 'decreasing';
    maxHeapIncrease: number;
    avgHeapIncrease: number;
  } {
    if (this.samples.length < 10) {
      return {
        hasLeak: false,
        trend: 'stable',
        maxHeapIncrease: 0,
        avgHeapIncrease: 0,
      };
    }

    const heapUsages = this.samples.map(s => s.heapUsed);
    const increases = heapUsages.slice(1).map((current, i) => current - heapUsages[i]);
    const positiveIncreases = increases.filter(inc => inc > 0);

    const avgIncrease =
      positiveIncreases.length > 0
        ? positiveIncreases.reduce((sum, inc) => sum + inc, 0) / positiveIncreases.length
        : 0;

    const maxIncrease = Math.max(...increases);
    const trend = avgIncrease > 0 ? 'increasing' : avgIncrease < 0 ? 'decreasing' : 'stable';

    // Simple heuristic: if average positive increase is > 1MB and trending up
    const hasLeak = avgIncrease > 1024 * 1024 && trend === 'increasing';

    return {
      hasLeak,
      trend,
      maxHeapIncrease: maxIncrease,
      avgHeapIncrease: avgIncrease,
    };
  }
}

// Performance assertion helpers
export const performanceAssert = {
  maxDuration: (metric: PerformanceMetrics, maxMs: number) => {
    if (metric.duration > maxMs) {
      throw new Error(
        `Performance assertion failed: duration ${metric.duration}ms exceeds maximum ${maxMs}ms`
      );
    }
  },

  maxMemoryIncrease: (metric: PerformanceMetrics, maxBytes: number) => {
    if (metric.memoryUsage.heapUsed > maxBytes) {
      throw new Error(
        `Performance assertion failed: memory increase ${metric.memoryUsage.heapUsed} bytes exceeds maximum ${maxBytes} bytes`
      );
    }
  },

  minRequestsPerSecond: (result: LoadTestResult, minRps: number) => {
    if (result.requestsPerSecond < minRps) {
      throw new Error(
        `Performance assertion failed: ${result.requestsPerSecond} RPS is below minimum ${minRps} RPS`
      );
    }
  },

  maxErrorRate: (result: LoadTestResult, maxPercent: number) => {
    if (result.errorRate > maxPercent) {
      throw new Error(
        `Performance assertion failed: error rate ${result.errorRate}% exceeds maximum ${maxPercent}%`
      );
    }
  },

  maxQueryTime: (result: DatabasePerformanceResult, maxMs: number) => {
    if (result.averageQueryTime > maxMs) {
      throw new Error(
        `Performance assertion failed: average query time ${result.averageQueryTime}ms exceeds maximum ${maxMs}ms`
      );
    }
  },
};

// Global instances
export const performanceMonitor = new PerformanceMonitor();
export const loadTester = new LoadTester();
export const dbPerformanceMonitor = new DatabasePerformanceMonitor();
export const memoryLeakDetector = new MemoryLeakDetector();

// Helper function to run performance tests
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  options?: { maxDuration?: number; maxMemory?: number }
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  performanceMonitor.start();
  const result = await fn();
  const metrics = performanceMonitor.stop();

  if (options?.maxDuration) {
    performanceAssert.maxDuration(metrics, options.maxDuration);
  }

  if (options?.maxMemory) {
    performanceAssert.maxMemoryIncrease(metrics, options.maxMemory);
  }

  return { result, metrics };
}
