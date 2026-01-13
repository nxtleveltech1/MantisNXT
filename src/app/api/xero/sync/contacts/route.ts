/**
 * Xero Contacts Sync API
 * 
 * POST /api/xero/sync/contacts
 * 
 * Sync suppliers and customers to Xero contacts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  syncSupplierToXero,
  syncSuppliersToXero,
  syncCustomerToXero,
  fetchContactsFromXero,
} from '@/lib/xero/sync/contacts';
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

    // Check Xero connection
    const isConnected = await hasActiveConnection(orgId);
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Not connected to Xero. Please connect first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, data } = body as { 
      type: 'supplier' | 'customer' | 'suppliers' | 'fetch';
      data?: unknown;
    };

    switch (type) {
      case 'supplier': {
        const result = await syncSupplierToXero(orgId, data as Parameters<typeof syncSupplierToXero>[1]);
        return NextResponse.json(result);
      }

      case 'suppliers': {
        const suppliers = data as Parameters<typeof syncSuppliersToXero>[1];
        const result = await syncSuppliersToXero(orgId, suppliers);
        return NextResponse.json(result);
      }

      case 'customer': {
        const result = await syncCustomerToXero(orgId, data as Parameters<typeof syncCustomerToXero>[1]);
        return NextResponse.json(result);
      }

      case 'fetch': {
        const options = data as { isSupplier?: boolean; isCustomer?: boolean; modifiedAfter?: string };
        const result = await fetchContactsFromXero(orgId, {
          isSupplier: options?.isSupplier,
          isCustomer: options?.isCustomer,
          modifiedAfter: options?.modifiedAfter ? new Date(options.modifiedAfter) : undefined,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Expected: supplier, suppliers, customer, or fetch' },
          { status: 400 }
        );
    }

  } catch (error) {
    return handleApiError(error, 'Xero Sync Contacts');
  }
}
