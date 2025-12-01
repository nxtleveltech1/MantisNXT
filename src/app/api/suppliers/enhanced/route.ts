import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated endpoint. Use /api/suppliers',
      deprecated: true,
      redirectTo: '/api/suppliers',
    },
    { status: 410 }
  );
}

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated endpoint. Use /api/suppliers',
      deprecated: true,
      redirectTo: '/api/suppliers',
    },
    { status: 410 }
  );
}

export async function PUT(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated. Use /api/suppliers',
      deprecated: true,
      redirectTo: '/api/suppliers',
    },
    { status: 410 }
  );
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated. Use /api/suppliers',
      deprecated: true,
      redirectTo: '/api/suppliers',
    },
    { status: 410 }
  );
}
