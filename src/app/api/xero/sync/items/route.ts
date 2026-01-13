/**
 * Xero Items Sync API
 * 
 * POST /api/xero/sync/items
 * 
 * Sync products to Xero items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  syncProductToXero,
  syncProductsToXero,
  fetchItemsFromXero,
} from '@/lib/xero/sync/items';
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
      type: 'single' | 'batch' | 'fetch';
      data?: unknown;
    };

    switch (type) {
      case 'single': {
        const result = await syncProductToXero(
          orgId, 
          data as Parameters<typeof syncProductToXero>[1]
        );
        return NextResponse.json(result);
      }

      case 'batch': {
        const products = data as Parameters<typeof syncProductsToXero>[1];
        const result = await syncProductsToXero(orgId, products);
        return NextResponse.json(result);
      }

      case 'fetch': {
        const options = data as { modifiedAfter?: string };
        const result = await fetchItemsFromXero(orgId, {
          modifiedAfter: options?.modifiedAfter ? new Date(options.modifiedAfter) : undefined,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Expected: single, batch, or fetch' },
          { status: 400 }
        );
    }

  } catch (error) {
    return handleApiError(error, 'Xero Sync Items');
  }
}
