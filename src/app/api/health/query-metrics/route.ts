import { NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    const total = (pool as unknown).totalCount ?? 0;
    const idle = (pool as unknown).idleCount ?? 0;
    const waiting = (pool as unknown).waitingCount ?? 0;
    const active = total - idle;
    const utilization = total > 0 ? ((active / total) * 100).toFixed(1) : "0.0";

    return NextResponse.json(
      {
        poolStatus: {
          total,
          active,
          idle,
          waiting,
          utilization: `${utilization}%`,
        },
        queryMetrics: {
          message: "Detailed query metrics unavailable without enterprise DB manager",
        },
        topSlowQueries: [],
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
