/**
 * Metrics Endpoint
 *
 * Provides Prometheus-compatible metrics for monitoring:
 * - Database connection pool metrics
 * - Session metrics
 * - Rate limiting metrics
 * - Application metrics
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getDbMetrics } from '@/lib/database/connection-pool';
import { sessionStore } from '@/lib/cache/redis-session-store';

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'json';

    // Collect metrics
    const dbMetrics = await getDbMetrics().catch(() => null);
    const sessionCount = await sessionStore.count().catch(() => 0);

    const metrics = {
      timestamp: Date.now(),
      application: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      database: dbMetrics || {
        totalConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        totalQueries: 0,
        slowQueries: 0,
        errors: 0,
        averageQueryTime: 0,
      },
      sessions: {
        active: sessionCount,
      },
    };

    // Return in requested format
    if (format === 'prometheus') {
      return new NextResponse(formatPrometheus(metrics), {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
        },
      });
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to collect metrics',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

function formatPrometheus(metrics: unknown): string {
  const lines: string[] = [];

  // Application metrics
  lines.push('# HELP app_uptime_seconds Application uptime in seconds');
  lines.push('# TYPE app_uptime_seconds gauge');
  lines.push(`app_uptime_seconds ${metrics.application.uptime}`);

  lines.push('# HELP app_memory_usage_bytes Memory usage in bytes');
  lines.push('# TYPE app_memory_usage_bytes gauge');
  lines.push(`app_memory_usage_bytes{type="rss"} ${metrics.application.memory.rss}`);
  lines.push(`app_memory_usage_bytes{type="heapTotal"} ${metrics.application.memory.heapTotal}`);
  lines.push(`app_memory_usage_bytes{type="heapUsed"} ${metrics.application.memory.heapUsed}`);
  lines.push(`app_memory_usage_bytes{type="external"} ${metrics.application.memory.external}`);

  // Database metrics
  lines.push('# HELP db_connections_total Total database connections');
  lines.push('# TYPE db_connections_total gauge');
  lines.push(`db_connections_total ${metrics.database.totalConnections}`);

  lines.push('# HELP db_connections_idle Idle database connections');
  lines.push('# TYPE db_connections_idle gauge');
  lines.push(`db_connections_idle ${metrics.database.idleConnections}`);

  lines.push('# HELP db_connections_waiting Waiting database connections');
  lines.push('# TYPE db_connections_waiting gauge');
  lines.push(`db_connections_waiting ${metrics.database.waitingRequests}`);

  lines.push('# HELP db_queries_total Total database queries executed');
  lines.push('# TYPE db_queries_total counter');
  lines.push(`db_queries_total ${metrics.database.totalQueries}`);

  lines.push('# HELP db_queries_slow Slow database queries');
  lines.push('# TYPE db_queries_slow counter');
  lines.push(`db_queries_slow ${metrics.database.slowQueries}`);

  lines.push('# HELP db_errors_total Database errors');
  lines.push('# TYPE db_errors_total counter');
  lines.push(`db_errors_total ${metrics.database.errors}`);

  lines.push('# HELP db_query_duration_avg Average query duration in milliseconds');
  lines.push('# TYPE db_query_duration_avg gauge');
  lines.push(`db_query_duration_avg ${metrics.database.averageQueryTime}`);

  // Session metrics
  lines.push('# HELP sessions_active Active sessions');
  lines.push('# TYPE sessions_active gauge');
  lines.push(`sessions_active ${metrics.sessions.active}`);

  return lines.join('\n') + '\n';
}
