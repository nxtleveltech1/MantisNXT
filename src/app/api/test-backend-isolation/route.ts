/**
 * CRITICAL BACKEND ISOLATION TEST
 * Ultra-minimal API to verify backend functionality without frontend dependencies
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Ultra-basic backend test without any complex imports
    const timestamp = new Date().toISOString();

    return NextResponse.json({
      success: true,
      status: 'backend_isolated',
      message: 'Backend API is functioning independently of frontend compilation',
      timestamp,
      server: 'operational',
      isolation_test: 'passed',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: 'backend_isolation_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
