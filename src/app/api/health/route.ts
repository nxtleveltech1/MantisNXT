/**
 * Comprehensive Health Check Endpoint
 *
 * Provides system health status for:
 * - Application
 * - Database connection pool
 * - Session store (no-op; auth is Clerk)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dbHealthCheck, getDbMetrics } from '@/lib/database/connection-pool';
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
    const [dbCheck, sessionCheck] = await Promise.all([
      dbHealthCheck().catch(err => ({
        healthy: false,
        error: err.message,
        latency: undefined,
        poolInfo: undefined,
      })),
      checkSessionStore(),
    ]);

    const status = dbCheck.healthy ? 'healthy' : 'unhealthy';

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
        sessions: sessionCheck,
      },
    };

    if (detailed) {
      const dbMetrics = await getDbMetrics().catch(() => null);
      if (dbMetrics) {
        health.metrics = { database: dbMetrics };
      }
    }

    const httpStatus = status === 'healthy' ? 200 : 503;
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
    return { status: 'healthy', count };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
