// @ts-nocheck

/**
 * API Performance Monitor
 *
 * Monitors API endpoint performance and provides metrics
 */

import type { NextRequest, NextResponse } from 'next/server';

export interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  error?: string;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  slowestEndpoints: Array<{
    endpoint: string;
    averageTime: number;
    requestCount: number;
  }>;
  errorEndpoints: Array<{
    endpoint: string;
    errorCount: number;
    errorRate: number;
  }>;
}

class APIMonitor {
  private metrics: APIMetrics[] = [];
  private maxMetrics = 10000; // Keep last 10k requests

  /**
   * Record API metrics
   */
  recordMetrics(metrics: APIMetrics): void {
    this.metrics.unshift(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindowMinutes: number = 60): PerformanceStats {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowestEndpoints: [],
        errorEndpoints: [],
      };
    }

    const totalRequests = recentMetrics.length;
    const averageResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    // Group by endpoint
    const endpointGroups = recentMetrics.reduce(
      (groups, metric) => {
        const key = `${metric.method} ${metric.endpoint}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(metric);
        return groups;
      },
      {} as Record<string, APIMetrics[]>
    );

    // Calculate slowest endpoints
    const slowestEndpoints = Object.entries(endpointGroups)
      .map(([endpoint, metrics]) => ({
        endpoint,
        averageTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
        requestCount: metrics.length,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    // Calculate error endpoints
    const errorEndpoints = Object.entries(endpointGroups)
      .map(([endpoint, metrics]) => {
        const errorCount = metrics.filter(m => m.statusCode >= 400).length;
        return {
          endpoint,
          errorCount,
          errorRate: (errorCount / metrics.length) * 100,
        };
      })
      .filter(e => e.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      slowestEndpoints,
      errorEndpoints,
    };
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(
    endpoint: string,
    method: string,
    timeWindowMinutes: number = 60
  ): APIMetrics[] {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    return this.metrics.filter(
      m => m.endpoint === endpoint && m.method === method && m.timestamp >= cutoffTime
    );
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): APIMetrics[] {
    return [...this.metrics];
  }
}

// Singleton instance
export const apiMonitor = new APIMonitor();

/**
 * Middleware to monitor API performance
 */
export function withAPIMonitoring(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const method = request.method;

    let response: NextResponse;
    let error: string | undefined;

    try {
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const responseTime = Date.now() - startTime;

      apiMonitor.recordMetrics({
        endpoint,
        method,
        responseTime,
        statusCode: response?.status || 500,
        timestamp: new Date(),
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress:
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        error,
      });
    }

    return response;
  };
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(timeWindowMinutes: number = 60): PerformanceStats {
  return apiMonitor.getStats(timeWindowMinutes);
}

/**
 * Get endpoint metrics
 */
export function getEndpointMetrics(
  endpoint: string,
  method: string,
  timeWindowMinutes: number = 60
): APIMetrics[] {
  return apiMonitor.getEndpointMetrics(endpoint, method, timeWindowMinutes);
}

export default APIMonitor;


