import { NextRequest, NextResponse } from "next/server";
import { testConnection, query } from "../../../../lib/database/connection";

export async function GET(request: NextRequest) {
  try {
    // Test basic connection
    const isConnected = await testConnection();

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
        },
        { status: 500 }
      );
    }

    // Test a simple query
    const result = await query(
      "SELECT NOW() as current_time, version() as postgres_version"
    );

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      data: {
        connected: true,
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].postgres_version,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Database test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}





