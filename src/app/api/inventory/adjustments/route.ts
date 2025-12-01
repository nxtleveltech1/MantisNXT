import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/database';
import { z } from 'zod';

const AdjustmentSchema = z.object({
  supplierProductId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().min(1),
  performedBy: z.string().optional(),
  locationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = AdjustmentSchema.parse(await req.json());
    const res = await withTransaction(async client => {
      // Get current stock from stock_on_hand
      const it = await client.query(
        `SELECT soh.soh_id, soh.qty, soh.supplier_product_id
         FROM core.stock_on_hand soh
         WHERE soh.supplier_product_id = $1::uuid
         FOR UPDATE`,
        [body.supplierProductId]
      );

      if (it.rowCount === 0) throw new Error('ITEM_NOT_FOUND');

      const currentQty = Number(it.rows[0].qty);
      const nextQty = currentQty + Number(body.delta);

      if (nextQty < 0) throw new Error('NEGATIVE_STOCK');

      // Update stock_on_hand
      await client.query(
        'UPDATE core.stock_on_hand SET qty = $1, as_of_ts = NOW() WHERE supplier_product_id = $2::uuid',
        [nextQty, body.supplierProductId]
      );

      // Record the movement
      await client.query(
        `INSERT INTO core.stock_movement (
          supplier_product_id,
          location_id,
          movement_type,
          qty,
          reference_doc,
          notes,
          movement_ts,
          created_by
        ) VALUES ($1::uuid, $2::uuid, 'ADJUSTMENT', $3, $4, $5, NOW(), $6)`,
        [
          body.supplierProductId,
          body.locationId || null,
          Math.abs(Number(body.delta)),
          body.reason,
          body.reason,
          body.performedBy || 'system',
        ]
      );

      return { stockQty: nextQty };
    });

    return NextResponse.json({ success: true, data: res });
  } catch (e: unknown) {
    const code = e?.message === 'NEGATIVE_STOCK' || e?.message === 'ITEM_NOT_FOUND' ? 400 : 500;
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: code });
  }
}
