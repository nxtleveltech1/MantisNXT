import { NextResponse } from "next/server";
import { dbManager } from "@/lib/database/enterprise-connection-manager";

export async function GET() {
  try {
    // Get connection manager status
    const status = dbManager.getStatus();

    // Get query metrics
    const queryMetrics = dbManager.getQueryMetrics();

    // Calculate pool utilization
    const poolUtilization =
      status.poolStatus.total > 0
        ? ((status.poolStatus.active / status.poolStatus.total) * 100).toFixed(
            1
          )
        : "0.0";

    return NextResponse.json(
      {
        poolStatus: {
          total: status.poolStatus.total,
          active: status.poolStatus.active,
          idle: status.poolStatus.idle,
          waiting: status.poolStatus.waiting,
          utilization: `${poolUtilization}%`,
        },
        circuitBreaker: {
          state: status.state,
          failures: status.circuitBreakerFailures,
          consecutiveSuccesses: status.circuitBreakerConsecutiveSuccesses,
          threshold: status.circuitBreakerThreshold,
        },
        queryMetrics: {
          totalQueries: queryMetrics.totalQueries,
          successfulQueries: queryMetrics.successfulQueries,
          slowQueries: queryMetrics.slowQueries,
          avgQueryDuration: queryMetrics.avgQueryDuration.toFixed(2),
        },
        topSlowQueries: queryMetrics.topSlowQueries.map((q: any) => ({
          fingerprint: q.fingerprint,
          count: q.count,
          avgDuration: q.avgDuration.toFixed(2),
          maxDuration: q.maxDuration.toFixed(2),
          minDuration: q.minDuration.toFixed(2),
          lastExecuted: new Date(q.lastExecuted).toISOString(),
        })),
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch query metrics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch query metrics",
        message: error instanceof Error ? error.message : "Unknown error",
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
