/**
 * POS Sales API
 * POST /api/v1/sales/pos - Process a complete POS sale transaction
 * GET /api/v1/sales/pos - Get recent POS transactions
 * 
 * This endpoint handles the full transaction flow:
 * 1. Creates sales order (status: completed)
 * 2. Creates invoice (status: paid)
 * 3. Decrements inventory
 * 4. Generates documents (order, invoice, receipt)
 * 5. Returns transaction result with document links
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { POSSalesService } from '@/lib/services/pos';
import { DocumentGenerationHooks } from '@/lib/services/docustore';

// Validation schema for POS sale
const posSaleItemSchema = z.object({
  product_id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  cost_price: z.number().nonnegative(),
  sale_price: z.number().nonnegative(),
  markup_percent: z.number().optional(),
});

const posSaleSchema = z.object({
  org_id: z.string().uuid(),
  store_id: z.string().optional(),
  customer_id: z.string().uuid(),
  payment_method: z.enum(['cash', 'card', 'digital', 'account']),
  payment_reference: z.string().optional(),
  items: z.array(posSaleItemSchema).min(1),
  notes: z.string().optional(),
  created_by: z.string().uuid().optional().nullable(),
});

/**
 * POST /api/v1/sales/pos
 * Process a complete POS sale
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = posSaleSchema.parse(body);

    // Process the sale
    const result = await POSSalesService.processSale(validated);

    // Trigger async document generation
    // This runs in the background and won't block the response
    if (result.success) {
      Promise.all([
        // Generate sales order PDF
        DocumentGenerationHooks.onSalesOrderCreated(
          result.sales_order_id,
          validated.org_id,
          validated.created_by || undefined
        ).catch((err) => console.error('Failed to generate sales order PDF:', err)),

        // Generate invoice PDF
        DocumentGenerationHooks.onInvoiceCreated(
          result.invoice_id,
          validated.org_id,
          validated.created_by || undefined
        ).catch((err) => console.error('Failed to generate invoice PDF:', err)),

        // Generate POS receipt (if hook exists)
        DocumentGenerationHooks.onPOSSaleCompleted?.(
          result.transaction_id,
          result.sales_order_id,
          result.invoice_id,
          validated.org_id,
          validated.created_by || undefined
        )?.catch((err) => console.error('Failed to generate POS receipt:', err)),
      ]).catch((err) => console.error('Document generation failed:', err));
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/v1/sales/pos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process POS sale',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/sales/pos
 * Get recent POS transactions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id');
    const storeId = searchParams.get('store_id') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'org_id is required' },
        { status: 400 }
      );
    }

    const transactions = await POSSalesService.getRecentTransactions(orgId, limit, storeId);

    return NextResponse.json({
      success: true,
      data: transactions,
      total: transactions.length,
      limit,
    });
  } catch (error) {
    console.error('Error in GET /api/v1/sales/pos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch POS transactions',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/sales/pos
 * Void a POS transaction
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id, sales_order_id, reason, voided_by } = body;

    if (!org_id || !sales_order_id || !reason) {
      return NextResponse.json(
        { success: false, error: 'org_id, sales_order_id, and reason are required' },
        { status: 400 }
      );
    }

    const result = await POSSalesService.voidTransaction(org_id, sales_order_id, reason, voided_by);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in DELETE /api/v1/sales/pos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to void POS transaction',
      },
      { status: 500 }
    );
  }
}

