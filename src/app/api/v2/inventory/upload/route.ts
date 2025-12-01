import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated API version. Use /api/inventory',
      deprecated: true,
      redirectTo: '/api/inventory',
    },
    { status: 410 }
  );
}
