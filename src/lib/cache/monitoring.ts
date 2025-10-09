/**
 * ITERATION 2 - ADR-1: Cache Performance Monitoring
 *
 * Monitors cache performance metrics for Phase 1 rollout.
 * Tracks hit rates, response times, and cache effectiveness.
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
  queryKey: string;
  timestamp: number;
  duration: number;
  cacheHit: boolean;
  dataSize?: number;
  error?: string;
}

/**
 * Cache performance statistics
 */
export interface CachePerformanceStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgResponseTime: number;
  avgCacheHitTime: number;
  avgCacheMissTime: number;
  improvementFactor: number; // How much faster cache hits are vs misses
  queryStats: Map<
    string,
    {
      queries: number;
      hits: number;
      misses: number;
      avgHitTime: number;
      avgMissTime: number;
      hitRate: number;
    }
  >;
}

/**
 * Cache performance monitor
 */
export class CachePerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Record a query performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.enabled) return;

    this.metrics.push(metric);

    // Keep only last N metrics to avoid memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): CachePerformanceStats {
    const totalQueries = this.metrics.length;
    const cacheHits = this.metrics.filter((m) => m.cacheHit).length;
    const cacheMisses = totalQueries - cacheHits;
    const hitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;

    const avgResponseTime =
      totalQueries > 0
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
        : 0;

    const hitMetrics = this.metrics.filter((m) => m.cacheHit);
    const missMetrics = this.metrics.filter((m) => !m.cacheHit);

    const avgCacheHitTime =
      hitMetrics.length > 0
        ? hitMetrics.reduce((sum, m) => sum + m.duration, 0) /
          hitMetrics.length
        : 0;

    const avgCacheMissTime =
      missMetrics.length > 0
        ? missMetrics.reduce((sum, m) => sum + m.duration, 0) /
          missMetrics.length
        : 0;

    const improvementFactor =
      avgCacheMissTime > 0 ? avgCacheMissTime / avgCacheHitTime : 1;

    // Calculate per-query stats
    const queryStats = new Map<
      string,
      {
        queries: number;
        hits: number;
        misses: number;
        avgHitTime: number;
        avgMissTime: number;
        hitRate: number;
      }
    >();

    this.metrics.forEach((metric) => {
      const existing = queryStats.get(metric.queryKey) || {
        queries: 0,
        hits: 0,
        misses: 0,
        avgHitTime: 0,
        avgMissTime: 0,
        hitRate: 0,
      };

      existing.queries++;
      if (metric.cacheHit) {
        existing.hits++;
      } else {
        existing.misses++;
      }

      queryStats.set(metric.queryKey, existing);
    });

    // Calculate averages for each query
    queryStats.forEach((stats, key) => {
      const queryMetrics = this.metrics.filter((m) => m.queryKey === key);
      const hits = queryMetrics.filter((m) => m.cacheHit);
      const misses = queryMetrics.filter((m) => !m.cacheHit);

      stats.avgHitTime =
        hits.length > 0
          ? hits.reduce((sum, m) => sum + m.duration, 0) / hits.length
          : 0;

      stats.avgMissTime =
        misses.length > 0
          ? misses.reduce((sum, m) => sum + m.duration, 0) / misses.length
          : 0;

      stats.hitRate = stats.queries > 0 ? stats.hits / stats.queries : 0;
    });

    return {
      totalQueries,
      cacheHits,
      cacheMisses,
      hitRate,
      avgResponseTime,
      avgCacheHitTime,
      avgCacheMissTime,
      improvementFactor,
      queryStats,
    };
  }

  /**
   * Get stats for specific query key
   */
  getQueryStats(queryKey: string) {
    const stats = this.getStats();
    return stats.queryStats.get(queryKey);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 10): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * Global performance monitor instance
 */
export const cachePerformanceMonitor = new CachePerformanceMonitor(
  process.env.NODE_ENV === 'development'
);

/**
 * Query observer for automatic performance tracking
 * Wraps React Query's useQuery to track performance
 */
export function trackQueryPerformance(
  queryKey: unknown[],
  cacheHit: boolean,
  duration: number,
  error?: Error
): void {
  cachePerformanceMonitor.recordMetric({
    queryKey: JSON.stringify(queryKey),
    timestamp: Date.now(),
    duration,
    cacheHit,
    error: error?.message,
  });
}

/**
 * Get performance report for logging/monitoring
 */
export function getPerformanceReport(): {
  summary: string;
  stats: CachePerformanceStats;
  topQueries: Array<{
    key: string;
    hitRate: number;
    avgHitTime: number;
    avgMissTime: number;
    improvement: string;
  }>;
} {
  const stats = cachePerformanceMonitor.getStats();

  const topQueries = Array.from(stats.queryStats.entries())
    .map(([key, queryStats]) => ({
      key,
      hitRate: queryStats.hitRate,
      avgHitTime: queryStats.avgHitTime,
      avgMissTime: queryStats.avgMissTime,
      improvement: `${Math.round(((queryStats.avgMissTime - queryStats.avgHitTime) / queryStats.avgMissTime) * 100)}%`,
    }))
    .sort((a, b) => b.hitRate - a.hitRate)
    .slice(0, 10);

  const summary = `
Cache Performance Summary:
- Total Queries: ${stats.totalQueries}
- Cache Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%
- Avg Response Time: ${stats.avgResponseTime.toFixed(0)}ms
- Avg Cache Hit Time: ${stats.avgCacheHitTime.toFixed(0)}ms
- Avg Cache Miss Time: ${stats.avgCacheMissTime.toFixed(0)}ms
- Improvement Factor: ${stats.improvementFactor.toFixed(1)}x faster
  `.trim();

  return {
    summary,
    stats,
    topQueries,
  };
}
