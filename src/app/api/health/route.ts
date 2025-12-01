/**
 * Comprehensive Health Check Endpoint
 *
 * Provides system health status for:
 * - Application
 * - Database connection pool
 * - Redis cache
 * - Session store
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dbHealthCheck, getDbMetrics } from '@/lib/database/connection-pool';
import { redisHealthCheck } from '@/lib/cache/redis-client';
import { sessionStore } from '@/lib/cache/redis-session-store';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      poolInfo?: unknown;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
    sessions: {
      status: 'healthy' | 'unhealthy';
      count?: number;
      error?: string;
    };
  };
  metrics?: {
    database?: unknown;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const detailed = request.nextUrl.searchParams.get('detailed') === 'true';

  try {
    // Perform health checks in parallel
    const [dbCheck, redisCheck] = await Promise.all([
      dbHealthCheck().catch(err => ({
        healthy: false,
        error: err.message,
        latency: undefined,
        poolInfo: undefined,
      })),
      redisHealthCheck().catch(err => ({
        healthy: false,
        error: err.message,
        latency: undefined,
      })),
    ]);

    // Check session store
    const sessionCheck = await checkSessionStore();

    // Determine overall status
    const status = determineOverallStatus(dbCheck, redisCheck, sessionCheck);

    const health: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: dbCheck.healthy ? 'healthy' : 'unhealthy',
          latency: 'latency' in dbCheck ? dbCheck.latency : undefined,
          poolInfo: 'poolInfo' in dbCheck ? dbCheck.poolInfo : undefined,
          error: 'error' in dbCheck ? dbCheck.error : undefined,
        },
        redis: {
          status: redisCheck.healthy ? 'healthy' : 'unhealthy',
          latency: 'latency' in redisCheck ? redisCheck.latency : undefined,
          error: 'error' in redisCheck ? redisCheck.error : undefined,
        },
        sessions: sessionCheck,
      },
    };

    // Add detailed metrics if requested
    if (detailed) {
      const dbMetrics = await getDbMetrics().catch(() => null);
      if (dbMetrics) {
        health.metrics = {
          database: dbMetrics,
        };
      }
    }

    // Return appropriate status code
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: httpStatus });
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

async function checkSessionStore(): Promise<{
  status: 'healthy' | 'unhealthy';
  count?: number;
  error?: string;
}> {
  try {
    const count = await sessionStore.count();
    return {
      status: 'healthy',
      count,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function determineOverallStatus(
  dbCheck: unknown,
  redisCheck: unknown,
  sessionCheck: unknown
): 'healthy' | 'degraded' | 'unhealthy' {
  // Database is critical
  if (!dbCheck.healthy) {
    return 'unhealthy';
  }

  // Redis and sessions are important but not critical
  const redisHealthy = redisCheck.healthy;
  const sessionsHealthy = sessionCheck.status === 'healthy';

  if (redisHealthy && sessionsHealthy) {
    return 'healthy';
  }

  if (!redisHealthy || !sessionsHealthy) {
    return 'degraded';
  }

  return 'healthy';
}
