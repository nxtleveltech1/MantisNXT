import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated endpoint. Use /api/inventory',
      deprecated: true,
      redirectTo: '/api/inventory',
    },
    { status: 410 }
  );
}

export async function POST() {
  return GET();
}

export async function PUT() {
  return GET();
}
