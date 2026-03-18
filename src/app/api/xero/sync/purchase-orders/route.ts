/**
 * Xero Purchase Orders Sync API
 * 
 * POST /api/xero/sync/purchase-orders
 * 
 * Sync purchase orders to Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  syncPurchaseOrderToXero,
  fetchPurchaseOrdersFromXero,
} from '@/lib/xero/sync/purchase-orders';
import { handleApiError } from '@/lib/xero/errors';
import { validateXeroRequest } from '@/lib/xero/validation';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;
    const { orgId } = validation;

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
