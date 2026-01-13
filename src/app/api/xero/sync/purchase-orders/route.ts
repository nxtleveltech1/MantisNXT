/**
 * Xero Purchase Orders Sync API
 * 
 * POST /api/xero/sync/purchase-orders
 * 
 * Sync purchase orders to Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  syncPurchaseOrderToXero,
  fetchPurchaseOrdersFromXero,
} from '@/lib/xero/sync/purchase-orders';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { handleApiError } from '@/lib/xero/errors';

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
        const result = await syncPurchaseOrderToXero(
          orgId, 
          data as Parameters<typeof syncPurchaseOrderToXero>[1]
        );
        return NextResponse.json(result);
      }

      case 'fetch': {
        const options = data as { status?: string; modifiedAfter?: string };
        const result = await fetchPurchaseOrdersFromXero(orgId, {
          status: options?.status,
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
    return handleApiError(error, 'Xero Sync Purchase Orders');
  }
}
