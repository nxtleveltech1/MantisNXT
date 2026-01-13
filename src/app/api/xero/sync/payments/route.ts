/**
 * Xero Payments Sync API
 * 
 * POST /api/xero/sync/payments
 * 
 * Sync payments to Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  syncPaymentToXero,
  fetchPaymentsFromXero,
} from '@/lib/xero/sync/payments';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { parseXeroApiError, getUserFriendlyMessage } from '@/lib/xero/errors';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected.' },
        { status: 400 }
      );
    }

    const isConnected = await hasActiveConnection(orgId);
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Not connected to Xero. Please connect first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, data } = body as { 
      type: 'create' | 'fetch';
      data?: unknown;
    };

    switch (type) {
      case 'create': {
        const result = await syncPaymentToXero(
          orgId, 
          data as Parameters<typeof syncPaymentToXero>[1]
        );
        return NextResponse.json(result);
      }

      case 'fetch': {
        const options = data as { modifiedAfter?: string };
        const result = await fetchPaymentsFromXero(orgId, {
          modifiedAfter: options?.modifiedAfter ? new Date(options.modifiedAfter) : undefined,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Expected: create or fetch' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Xero Sync Payments] Error:', error);
    
    const parsedError = parseXeroApiError(error);
    const message = getUserFriendlyMessage(parsedError);

    return NextResponse.json(
      { success: false, error: message, code: parsedError.code },
      { status: 500 }
    );
  }
}
