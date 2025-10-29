import { NextResponse } from 'next/server';

export async function GET() {
  // Keep this endpoint simple during build to avoid importing heavy scripts.
  // Runtime health checks can be performed via a separate admin tool.
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Deprecated. Use /api/health', deprecated: true, redirectTo: '/api/health' },
    { status: 410 }
  )
}
