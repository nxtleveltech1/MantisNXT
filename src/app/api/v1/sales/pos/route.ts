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
import { query } from '@/lib/database';
import { POSSalesService } from '@/lib/services/pos';
import { DocumentGenerationHooks } from '@/lib/services/docustore';

/**
 * Get a valid organization ID - either the provided one or the first available
 */
async function resolveOrgId(providedOrgId?: string): Promise<string> {
  // If provided, verify it exists
  if (providedOrgId) {
    const check = await query<{ id: string }>(
      'SELECT id FROM organization WHERE id = $1 LIMIT 1',
      [providedOrgId]
    );
    if (check.rows.length > 0) {
      return check.rows[0].id;
    }
  }

  // Get the first available organization
  const result = await query<{ id: string }>(
    'SELECT id FROM organization ORDER BY created_at ASC LIMIT 1'
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  // Create a default organization if none exists
  const createResult = await query<{ id: string }>(
    `INSERT INTO organization (name, slug, plan_type, settings)
     VALUES ('Default Organization', 'default', 'starter', '{}')
     RETURNING id`
  );

  return createResult.rows[0].id;
}

/**
 * Resolve customer ID - verify it exists or get/create a walk-in customer
 */
async function resolveCustomerId(providedCustomerId: string, orgId: string): Promise<string> {
  // If provided, verify it exists
  const check = await query<{ id: string }>(
    'SELECT id FROM customer WHERE id = $1 LIMIT 1',
    [providedCustomerId]
  );
  if (check.rows.length > 0) {
    return check.rows[0].id;
  }

  // Look for an existing walk-in customer
  const walkIn = await query<{ id: string }>(
    `SELECT id FROM customer 
     WHERE (name ILIKE '%walk%in%' OR name ILIKE '%walkin%' OR name = 'Walk-in Customer')
     ORDER BY created_at ASC LIMIT 1`
  );

  if (walkIn.rows.length > 0) {
    return walkIn.rows[0].id;
  }

  // Create a walk-in customer
  const createResult = await query<{ id: string }>(
    `INSERT INTO customer (org_id, name, email, segment, status)
     VALUES ($1, 'Walk-in Customer', 'walkin@pos.local', 'individual', 'active')
     RETURNING id`,
    [orgId]
  );

  return createResult.rows[0].id;
}

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

    // Resolve valid org_id and customer_id
    const resolvedOrgId = await resolveOrgId(validated.org_id);
    const resolvedCustomerId = await resolveCustomerId(validated.customer_id, resolvedOrgId);
    const saleInput = { 
      ...validated, 
      org_id: resolvedOrgId,
      customer_id: resolvedCustomerId,
    };

    // Process the sale
    const result = await POSSalesService.processSale(saleInput);

    // Trigger async document generation
    // This runs in the background and won't block the response
    if (result.success) {
      Promise.all([
        // Generate sales order PDF
        DocumentGenerationHooks.onSalesOrderCreated(
          result.sales_order_id,
          resolvedOrgId,
          saleInput.created_by || undefined
        ).catch((err) => console.error('Failed to generate sales order PDF:', err)),

        // Generate invoice PDF
        DocumentGenerationHooks.onInvoiceCreated(
          result.invoice_id,
          resolvedOrgId,
          saleInput.created_by || undefined
        ).catch((err) => console.error('Failed to generate invoice PDF:', err)),

        // Generate POS receipt (if hook exists)
        DocumentGenerationHooks.onPOSSaleCompleted?.(
          result.transaction_id,
          result.sales_order_id,
          result.invoice_id,
          resolvedOrgId,
          saleInput.created_by || undefined
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
    const providedOrgId = searchParams.get('org_id');
    const storeId = searchParams.get('store_id') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    // Resolve org_id - use provided or get default
    const orgId = await resolveOrgId(providedOrgId || undefined);

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

