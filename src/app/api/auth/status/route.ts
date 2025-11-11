import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // For now, return a mock authenticated user for testing
    // In production, this would check actual JWT tokens
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: 'test-user-1',
        email: 'test@mantisnxt.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['admin', 'suppliers.read', 'suppliers.write', 'pricelist.upload']
      },
      message: 'Authentication status retrieved successfully'
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        message: 'Failed to retrieve authentication status',
        error: 'AUTH_STATUS_ERROR'
      },
      { status: 500 }
    );
  }
}


