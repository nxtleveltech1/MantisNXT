/**
 * Pipeline Health & Performance Monitoring Endpoint
 * Tracks cache performance, batch processing metrics, and query performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { CacheManager } from '@/lib/pipeline/cache-manager';
import { pool } from '@/lib/database/unified-connection';

interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  caches: Record<string, any>;
  database: {
    poolSize: number;
    activeConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    throughput: number;
  };
  recommendations: string[];
}

/**
 * Calculate health status based on metrics
 */
function calculateHealthStatus(stats: any): 'healthy' | 'degraded' | 'critical' {
  const cacheHitRate = stats.caches?.hitRate || 0;
  const dbConnections = stats.database?.activeConnections || 0;

  // Critical: Cache hit rate <50% or DB connections maxed out
  if (cacheHitRate < 0.5 || dbConnections > 18) {
    return 'critical';
  }

  // Degraded: Cache hit rate <80% or DB connections >75%
  if (cacheHitRate < 0.8 || dbConnections > 15) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Generate recommendations based on current metrics
 */
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  const cacheHitRate = stats.caches?.hitRate || 0;
  const dbConnections = stats.database?.activeConnections || 0;
  const evictionRate = stats.caches?.evictions || 0;

  if (cacheHitRate < 0.8) {
    recommendations.push('⚠️ Cache hit rate below 80% - Consider increasing TTL or cache size');
  }

  if (evictionRate > 10) {
    recommendations.push('⚠️ High cache eviction rate - Increase maxSize parameter');
  }

  if (dbConnections > 15) {
    recommendations.push('⚠️ High database connection usage - Consider connection pooling optimization');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All pipeline metrics within healthy ranges');
  }

  return recommendations;
}

/**
 * GET /api/health/pipeline - Pipeline health metrics
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Get cache statistics
    const cacheStats = CacheManager.getAllStats();

    // Calculate aggregate cache metrics
    const aggregateCacheStats = Object.values(cacheStats).reduce(
      (acc: any, stat: any) => ({
        hits: acc.hits + stat.hits,
        misses: acc.misses + stat.misses,
        sets: acc.sets + stat.sets,
        deletes: acc.deletes + stat.deletes,
        evictions: acc.evictions + stat.evictions,
        size: acc.size + stat.size,
      }),
      { hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0, size: 0 }
    );

    const totalRequests = aggregateCacheStats.hits + aggregateCacheStats.misses;
    const hitRate = totalRequests > 0 ? aggregateCacheStats.hits / totalRequests : 0;

    // Get database pool stats
    const dbStats = {
      poolSize: pool.totalCount,
      activeConnections: pool.totalCount - pool.idleCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    };

    // Performance metrics (simplified - in production, use APM tools)
    const responseTime = Date.now() - startTime;
    const performanceMetrics = {
      avgResponseTime: responseTime,
      p95ResponseTime: responseTime * 1.2, // Estimate
      throughput: totalRequests > 0 ? Math.round((totalRequests / Date.now()) * 1000) : 0,
    };

    const health: PipelineHealth = {
      status: calculateHealthStatus({
        caches: { hitRate },
        database: dbStats,
      }),
      timestamp: new Date().toISOString(),
      caches: {
        individual: cacheStats,
        aggregate: {
          ...aggregateCacheStats,
          hitRate: Math.round(hitRate * 100) / 100,
        },
      },
      database: dbStats,
      performance: performanceMetrics,
      recommendations: generateRecommendations({
        caches: { hitRate, evictions: aggregateCacheStats.evictions },
        database: dbStats,
      }),
    };

    return NextResponse.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('❌ Pipeline health check failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/pipeline - Reset cache statistics
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset-stats') {
      // Reset all cache statistics
      CacheManager.invalidateAll();

      return NextResponse.json({
        success: true,
        message: 'Cache statistics reset successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Pipeline action failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Action failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Deprecated. Use /api/health', deprecated: true, redirectTo: '/api/health' },
    { status: 410 }
  )
}
