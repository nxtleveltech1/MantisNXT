import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import { getAgreementByReservation } from '@/services/rentals/agreementService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const agreement = await getAgreementByReservation(params.id);

    if (!agreement) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Rental agreement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: agreement });
  } catch (error) {
    console.error('Error in GET /api/rentals/reservations/[id]/agreement:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agreement',
      },
      { status: 500 }
    );
  }
}

