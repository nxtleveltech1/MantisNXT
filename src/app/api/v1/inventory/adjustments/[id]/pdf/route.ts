// UPDATE: [2025-12-25] Created stock adjustment PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../../sales/_helpers';
import { InventoryPDFService, type StockAdjustmentData } from '@/lib/services/inventory/inventory-pdf-service';
import { query } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AdjustmentRow {
  id: string;
  adjustment_number: string;
  adjustment_type: string;
  reason: string;
  adjustment_date: string;
  approved_by: string | null;
  notes: string | null;
}

interface AdjustmentItemRow {
  product_name: string;
  sku: string;
  previous_quantity: number;
  adjustment_quantity: number;
  new_quantity: number;
  unit_cost: number | null;
  total_value: number | null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;

    // Fetch adjustment details
    const adjustmentResult = await query<AdjustmentRow>(
      `SELECT id, adjustment_number, adjustment_type, reason, adjustment_date, approved_by, notes
       FROM inventory.stock_adjustments 
       WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );

    if (adjustmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock adjustment not found' },
        { status: 404 }
      );
    }

    const adjustment = adjustmentResult.rows[0];

    // Fetch adjustment items
    const itemsResult = await query<AdjustmentItemRow>(
      `SELECT 
         p.name as product_name,
         p.sku,
         sai.previous_quantity,
         sai.adjustment_quantity,
         sai.new_quantity,
         sai.unit_cost,
         sai.total_value
       FROM inventory.stock_adjustment_items sai
       JOIN inventory.products p ON p.id = sai.product_id
       WHERE sai.adjustment_id = $1
       ORDER BY sai.line_number`,
      [id]
    );

    const data: StockAdjustmentData = {
      adjustmentId: adjustment.id,
      adjustmentNumber: adjustment.adjustment_number,
      orgId,
      adjustmentType: adjustment.adjustment_type as 'increase' | 'decrease' | 'write_off' | 'transfer',
      reason: adjustment.reason,
      date: adjustment.adjustment_date,
      items: itemsResult.rows.map(item => ({
        productName: item.product_name,
        sku: item.sku,
        previousQty: item.previous_quantity,
        adjustedQty: item.adjustment_quantity,
        newQty: item.new_quantity,
        unitCost: item.unit_cost || undefined,
        totalValue: item.total_value || undefined,
      })),
      approvedBy: adjustment.approved_by || undefined,
      notes: adjustment.notes || undefined,
    };

    const { pdfBuffer } = await InventoryPDFService.generateStockAdjustment(data, userId);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${adjustment.adjustment_number}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating stock adjustment PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

