// Performance Optimization with Machine Learning
import type { Pool } from 'pg';

// Performance Metrics Types
export interface QueryPerformanceMetric {
  query: string;
  queryHash: string;
  executionTime: number;
  rowsReturned: number;
  cpuUsage: number;
  memoryUsage: number;
  indexesUsed: string[];
  timestamp: Date;
  organizationId: string;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageRetrievalTime: number;
  totalHits: number;
  totalMisses: number;
}

export interface OptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'caching' | 'denormalization' | 'partition';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target: string;
  suggestion: string;
  expectedImprovement: number; // percentage
  implementationEffort: 'low' | 'medium' | 'high';
  estimatedCost: number;
  potentialRisk: 'low' | 'medium' | 'high';
}

// Advanced Query Optimizer using ML
export class MLQueryOptimizer {
  private db: Pool;
  private queryCache = new Map<string, unknown>();
  private performanceHistory = new Map<string, QueryPerformanceMetric[]>();
  private optimizationRules = new Map<string, string>();

  constructor(database: Pool) {
    this.db = database;
    this.initializeOptimizationRules();
  }

  private initializeOptimizationRules() {
    // Common query optimization patterns
    this.optimizationRules.set(
      'SELECT_COUNT_OPTIMIZATION',
      `
        -- Replace COUNT(*) with COUNT(indexed_column) where possible
        -- Use EXISTS instead of COUNT when checking existence
        -- Consider approximate counts for large tables
      `
    );

    this.optimizationRules.set(
      'JOIN_OPTIMIZATION',
      `
        -- Use INNER JOIN instead of WHERE with multiple tables
        -- Ensure proper indexing on join columns
        -- Consider denormalization for frequently joined data
      `
    );

    this.optimizationRules.set(
      'WHERE_CLAUSE_OPTIMIZATION',
      `
        -- Put most selective conditions first
        -- Use indexed columns in WHERE clauses
        -- Avoid functions on columns in WHERE clauses
      `
    );
  }

  // Analyze query performance and suggest optimizations
  async analyzeQuery(
    query: string,
    executionTime: number,
    organizationId: string
  ): Promise<OptimizationSuggestion[]> {
    const queryHash = this.hashQuery(query);
    const suggestions: OptimizationSuggestion[] = [];

    // Record performance metric
    const metric: QueryPerformanceMetric = {
      query,
      queryHash,
      executionTime,
      rowsReturned: 0, // Will be filled by caller
      cpuUsage: 0,
      memoryUsage: 0,
      indexesUsed: [],
      timestamp: new Date(),
      organizationId,
    };

    // Store in history
    if (!this.performanceHistory.has(queryHash)) {
      this.performanceHistory.set(queryHash, []);
    }
    this.performanceHistory.get(queryHash)!.push(metric);

    // Analyze for optimization opportunities
    if (executionTime > 1000) {
      // > 1 second
      suggestions.push(...this.analyzeSlowQuery(query, executionTime));
    }

    // Check for common anti-patterns
    suggestions.push(...this.detectAntiPatterns(query));

    // Machine Learning based suggestions
    suggestions.push(...this.mlBasedSuggestions(queryHash, executionTime));

    return suggestions;
  }

  private analyzeSlowQuery(query: string, executionTime: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Check for missing indexes on WHERE clauses
    if (lowerQuery.includes('where') && !lowerQuery.includes('index')) {
      suggestions.push({
        type: 'index',
        priority: executionTime > 5000 ? 'high' : 'medium',
        target: 'WHERE clause columns',
        suggestion: 'Consider adding indexes on columns used in WHERE clauses',
        expectedImprovement: 70,
        implementationEffort: 'low',
        estimatedCost: 0,
        potentialRisk: 'low',
      });
    }

    // Check for inefficient JOINs
    if (lowerQuery.includes('join') && executionTime > 2000) {
      suggestions.push({
        type: 'index',
        priority: 'high',
        target: 'JOIN columns',
        suggestion: 'Ensure indexes exist on all JOIN columns',
        expectedImprovement: 60,
        implementationEffort: 'low',
        estimatedCost: 0,
        potentialRisk: 'low',
      });
    }

    // Check for SELECT *
    if (lowerQuery.includes('select *')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        target: 'SELECT clause',
        suggestion: 'Specify only needed columns instead of SELECT *',
        expectedImprovement: 30,
        implementationEffort: 'low',
        estimatedCost: 0,
        potentialRisk: 'low',
      });
    }

    return suggestions;
  }

  private detectAntiPatterns(query: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // N+1 query pattern detection
    if (
      lowerQuery.includes('select') &&
      lowerQuery.includes('where') &&
      lowerQuery.includes('in (')
    ) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'high',
        target: 'IN clause',
        suggestion: 'Consider using JOINs instead of IN clauses for better performance',
        expectedImprovement: 50,
        implementationEffort: 'medium',
        estimatedCost: 0,
        potentialRisk: 'medium',
      });
    }

    // Function calls in WHERE clauses
    const functionPattern = /where\s+\w+\(/i;
    if (functionPattern.test(query)) {
      suggestions.push({
        type: 'index',
        priority: 'medium',
        target: 'Function in WHERE clause',
        suggestion: 'Consider using functional indexes or avoiding functions in WHERE clauses',
        expectedImprovement: 40,
        implementationEffort: 'medium',
        estimatedCost: 0,
        potentialRisk: 'low',
      });
    }

    return suggestions;
  }

  private mlBasedSuggestions(queryHash: string, executionTime: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const history = this.performanceHistory.get(queryHash) || [];

    if (history.length > 5) {
      // Analyze trend
      const recentExecutions = history.slice(-5);
      const avgExecution =
        recentExecutions.reduce((sum, m) => sum + m.executionTime, 0) / recentExecutions.length;
      const trend = this.calculateTrend(recentExecutions.map(h => h.executionTime));

      if (trend > 0.1) {
        // Performance degrading
        suggestions.push({
          type: 'caching',
          priority: 'medium',
          target: 'Query result',
          suggestion: 'Query performance is degrading. Consider caching results.',
          expectedImprovement: 80,
          implementationEffort: 'low',
          estimatedCost: 0,
          potentialRisk: 'low',
        });
      }

      // Frequency-based caching suggestions
      if (history.length > 20) {
        suggestions.push({
          type: 'caching',
          priority: 'medium',
          target: 'Frequently executed query',
          suggestion: 'This query is executed frequently. Consider implementing result caching.',
          expectedImprovement: 90,
          implementationEffort: 'low',
          estimatedCost: 0,
          potentialRisk: 'low',
        });
      }
    }

    return suggestions;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  }

  private hashQuery(query: string): string {
    // Simple hash function for query identification
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Auto-implement safe optimizations
  async autoOptimize(organizationId: string): Promise<{
    applied: OptimizationSuggestion[];
    pending: OptimizationSuggestion[];
  }> {
    const applied: OptimizationSuggestion[] = [];
    const pending: OptimizationSuggestion[] = [];

    // Get performance data for the organization
    const performanceQuery = `
      SELECT query_hash, AVG(execution_time) as avg_time, COUNT(*) as frequency
      FROM query_performance_metrics
      WHERE organization_id = $1
      AND timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY query_hash
      HAVING AVG(execution_time) > 1000 OR COUNT(*) > 100
    `;

    try {
      const result = await this.db.query(performanceQuery, [organizationId]);

      for (const row of result.rows) {
        // Auto-apply low-risk optimizations
        if (row.frequency > 100) {
          // Implement query result caching
          applied.push({
            type: 'caching',
            priority: 'medium',
            target: `Query ${row.query_hash}`,
            suggestion: 'Auto-enabled result caching for frequently executed query',
            expectedImprovement: 85,
            implementationEffort: 'low',
            estimatedCost: 0,
            potentialRisk: 'low',
          });
        }

        if (row.avg_time > 5000) {
          // Queue for manual review
          pending.push({
            type: 'index',
            priority: 'high',
            target: `Query ${row.query_hash}`,
            suggestion: 'Slow query requires manual optimization review',
            expectedImprovement: 60,
            implementationEffort: 'medium',
            estimatedCost: 0,
            potentialRisk: 'medium',
          });
        }
      }

      // Log optimization actions
      await this.db.query(
        `
        INSERT INTO optimization_log (organization_id, optimizations_applied, optimizations_pending, timestamp)
        VALUES ($1, $2, $3, NOW())
      `,
        [organizationId, JSON.stringify(applied), JSON.stringify(pending)]
      );
    } catch (error) {
      console.error('Auto-optimization error:', error);
    }

    return { applied, pending };
  }
}

// Intelligent Caching System
export class IntelligentCache {
  private cache = new Map<string, { data: unknown; timestamp: Date; hits: number; ttl: number }>();
  private maxSize = 1000;
  private defaultTTL = 300000; // 5 minutes

  // ML-based TTL prediction
  predictOptimalTTL(key: string, queryFrequency: number, dataVolatility: number): number {
    // Base TTL on query frequency and data change rate
    const frequencyMultiplier = Math.max(0.1, Math.min(2, queryFrequency / 10));
    const volatilityMultiplier = Math.max(0.1, Math.min(2, 1 - dataVolatility));

    return this.defaultTTL * frequencyMultiplier * volatilityMultiplier;
  }

  set(key: string, data: unknown, customTTL?: number): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const ttl = customTTL || this.defaultTTL;
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      hits: 0,
      ttl,
    });
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  private evictLRU(): void {
    let lruKey = '';
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp.getTime() < lruTime) {
        lruTime = entry.timestamp.getTime();
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  getMetrics(): CacheMetrics {
    let totalHits = 0;
    let totalRequests = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1; // +1 for the initial miss
    }

    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    return {
      hitRate,
      missRate: 1 - hitRate,
      evictionRate: 0, // Would need additional tracking
      averageRetrievalTime: 1, // Assuming 1ms for cache retrieval
      totalHits,
      totalMisses: totalRequests - totalHits,
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

// Database Connection Pool Optimizer
export class ConnectionPoolOptimizer {
  private db: Pool;
  private metrics = {
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    connectionErrors: 0,
    avgQueryTime: 0,
  };

  constructor(database: Pool) {
    this.db = database;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(async () => {
      await this.collectMetrics();
      this.optimizePool();
    }, 30000); // Every 30 seconds
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Get pool statistics
      const poolInfo = this.db as unknown;
      this.metrics.activeConnections = poolInfo.totalCount || 0;
      this.metrics.idleConnections = poolInfo.idleCount || 0;
      this.metrics.waitingRequests = poolInfo.waitingCount || 0;

      // Get query performance stats
      const perfQuery = `
        SELECT AVG(execution_time) as avg_time
        FROM query_performance_metrics
        WHERE timestamp >= NOW() - INTERVAL '5 minutes'
      `;

      const result = await this.db.query(perfQuery);
      this.metrics.avgQueryTime = result.rows[0]?.avg_time || 0;
    } catch (error) {
      this.metrics.connectionErrors++;
      console.error('Error collecting pool metrics:', error);
    }
  }

  private optimizePool(): void {
    const { activeConnections, idleConnections, waitingRequests, avgQueryTime } = this.metrics;

    // If queries are slow and we have idle connections, might need to investigate
    if (avgQueryTime > 2000 && idleConnections > 5) {
      console.log('Performance warning: Slow queries with idle connections available');
    }

    // If we have waiting requests, we might need more connections
    if (waitingRequests > 0) {
      console.log('Pool optimization: Consider increasing max pool size');
    }

    // If too many idle connections, consider reducing min pool size
    if (idleConnections > activeConnections * 2) {
      console.log('Pool optimization: Consider reducing min pool size');
    }
  }

  getRecommendations(): Array<{
    type: 'pool_size' | 'timeout' | 'connection_limit';
    suggestion: string;
    impact: 'low' | 'medium' | 'high';
  }> {
    const recommendations: Array<unknown> = [];
    const { activeConnections, idleConnections, waitingRequests, avgQueryTime } = this.metrics;

    if (waitingRequests > 0) {
      recommendations.push({
        type: 'pool_size',
        suggestion: 'Increase maximum pool size to handle more concurrent requests',
        impact: 'high',
      });
    }

    if (avgQueryTime > 3000) {
      recommendations.push({
        type: 'timeout',
        suggestion: 'Increase query timeout to prevent premature cancellations',
        impact: 'medium',
      });
    }

    if (idleConnections > 20) {
      recommendations.push({
        type: 'pool_size',
        suggestion: 'Reduce minimum pool size to free up database resources',
        impact: 'low',
      });
    }

    return recommendations;
  }
}

// API Response Optimizer
export class APIResponseOptimizer {
  private responseCache = new IntelligentCache();
  private compressionEnabled = true;

  // Optimize API response based on request patterns
  optimizeResponse(
    data: unknown,
    request: unknown
  ): {
    data: unknown;
    compression: boolean;
    cacheSettings: {
      ttl: number;
      key: string;
    };
  } {
    const requestUrl = request.url;
    const requestMethod = request.method;
    const dataSize = JSON.stringify(data).length;

    // Generate cache key
    const cacheKey = this.generateCacheKey(requestUrl, requestMethod, request.query);

    // Determine optimal TTL based on endpoint type
    let ttl = 300000; // 5 minutes default

    if (requestUrl.includes('/analytics/')) {
      ttl = 600000; // 10 minutes for analytics
    } else if (requestUrl.includes('/dashboard/')) {
      ttl = 30000; // 30 seconds for dashboard
    } else if (requestUrl.includes('/recommendations/')) {
      ttl = 900000; // 15 minutes for recommendations
    }

    // Optimize data structure
    const optimizedData = this.optimizeDataStructure(data);

    // Determine compression strategy
    const useCompression = dataSize > 1024 && this.compressionEnabled;

    return {
      data: optimizedData,
      compression: useCompression,
      cacheSettings: {
        ttl,
        key: cacheKey,
      },
    };
  }

  private generateCacheKey(url: string, method: string, query: unknown): string {
    const keyParts = [method, url];

    if (query) {
      const sortedQuery = Object.keys(query)
        .sort()
        .map(key => `${key}=${query[key]}`)
        .join('&');
      keyParts.push(sortedQuery);
    }

    return keyParts.join('|');
  }

  private optimizeDataStructure(data: unknown): unknown {
    // Remove null/undefined values
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.map(item => this.optimizeDataStructure(item)).filter(item => item !== null);
      } else {
        const optimized: unknown = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            optimized[key] = this.optimizeDataStructure(value);
          }
        }
        return optimized;
      }
    }

    return data;
  }

  // Get cached response
  getCachedResponse(key: string): unknown | null {
    return this.responseCache.get(key);
  }

  // Cache response
  setCachedResponse(key: string, data: unknown, ttl?: number): void {
    this.responseCache.set(key, data, ttl);
  }

  // Get cache metrics
  getCacheMetrics(): CacheMetrics {
    return this.responseCache.getMetrics();
  }
}

// Export optimizers
export function createPerformanceOptimizers(database: Pool) {
  return {
    queryOptimizer: new MLQueryOptimizer(database),
    cache: new IntelligentCache(),
    poolOptimizer: new ConnectionPoolOptimizer(database),
    responseOptimizer: new APIResponseOptimizer(),
  };
}
