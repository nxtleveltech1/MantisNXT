/**
 * POST /api/core/selections/add-from-upload
 * Adds all products from a given upload into a selection (status='selected').
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const selectionId: string | undefined = body?.selection_id;
    const uploadId: string | undefined = body?.upload_id;
    const selectedBy: string = body?.selected_by || 'system';

    if (!selectionId || !uploadId) {
      return NextResponse.json(
        { success: false, error: 'selection_id and upload_id are required' },
        { status: 400 }
      );
    }

    // Find supplier for the upload
    const supplierRes = await dbQuery<{ supplier_id: string }>(
      'SELECT supplier_id FROM spp.pricelist_upload WHERE upload_id = $1',
      [uploadId]
    );
    const supplierId = supplierRes.rows[0]?.supplier_id;
    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'Upload not found or missing supplier' },
        { status: 404 }
      );
    }

    // Collect supplier_product_ids from this upload (valid rows only by natural merge effects)
    const idsRes = await dbQuery<{ supplier_product_id: string }>(
      `SELECT DISTINCT sp.supplier_product_id
       FROM spp.pricelist_row r
       JOIN core.supplier_product sp
         ON sp.supplier_id = $1 AND sp.supplier_sku = r.supplier_sku
       WHERE r.upload_id = $2`,
      [supplierId, uploadId]
    );

    const productIds = idsRes.rows.map(r => r.supplier_product_id);
    if (productIds.length === 0) {
      return NextResponse.json({ success: true, data: { added: 0 } });
    }

    // Add products to selection in batches
    const batchSize = 200;
    let added = 0;
    const errors: string[] = [];

    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      try {
        const res = await inventorySelectionService.addProducts(
          selectionId,
          batch,
          selectedBy
        );
        added += res.added;
        if (res.errors.length) errors.push(...res.errors);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    return NextResponse.json({ success: true, data: { added, total: productIds.length, errors } });
  } catch (error) {
    console.error('[API] add-from-upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add products from upload' },
      { status: 500 }
    );
  }
}

