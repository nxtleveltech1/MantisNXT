import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return NextResponse.json({
      success: true,
      message: 'MantisNXT API is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'operational'
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Health check failed',
        error: 'HEALTH_CHECK_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}