/**
 * Xero Single Quote Sync API
 * 
 * POST /api/xero/sync/quotes/[id]
 * GET /api/xero/sync/quotes/[id]/status
 * 
 * Sync a single quotation by NXT ID to Xero
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { QuotationService } from '@/lib/services/sales';
import { syncQuoteToXero } from '@/lib/xero/sync/quotes';
import { validateXeroRequest, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      );
    }

    const quotation = await QuotationService.getQuotationById(id, orgId);
    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Get line items
    const items = await QuotationService.getQuotationItems(id);

    const nxtQuote = {
      id: quotation.id,
      customerId: quotation.customer_id,
      quoteNumber: quotation.document_number,
      date: quotation.created_at,
      expiryDate: quotation.valid_until || undefined,
      title: quotation.reference_number || undefined,
      summary: quotation.notes || undefined,
      terms: undefined,
      status: quotation.status,
      lineItems: items.map(item => ({
        description: item.description || item.name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
    };

    const result = await syncQuoteToXero(orgId, nxtQuote);
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Sync Quote');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      );
    }

    // Check sync status
    const result = await query<{
      xero_entity_id: string;
      sync_status: string;
      last_synced_at: Date | null;
    }>(
      `SELECT xero_entity_id, sync_status, last_synced_at 
       FROM xero_entity_mappings 
       WHERE org_id = $1 AND entity_type = 'quote' AND nxt_entity_id = $2`,
      [orgId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        synced: false,
      });
    }

    const mapping = result.rows[0];
    return NextResponse.json({
      synced: mapping.sync_status === 'synced',
      xeroEntityId: mapping.xero_entity_id,
      lastSyncedAt: mapping.last_synced_at?.toISOString(),
    });

  } catch (error) {
    return handleApiError(error, 'Xero Quote Status');
  }
}
