import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/database';
import { z } from 'zod';

const AdjustmentSchema = z.object({
  inventoryItemId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().min(1),
  performedBy: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = AdjustmentSchema.parse(await req.json());
    const res = await withTransaction(async (client) => {
      const it = await client.query('SELECT id, stock_qty, reserved_qty FROM inventory_item WHERE id=$1 FOR UPDATE', [body.inventoryItemId]);
      if (it.rowCount === 0) throw new Error('ITEM_NOT_FOUND');
      let stock = Number(it.rows[0].stock_qty);
      const reserved = Number(it.rows[0].reserved_qty);
      const next = stock + Number(body.delta);
      if (next < 0) throw new Error('NEGATIVE_STOCK');
      if (reserved > next) throw new Error('RESERVED_GT_STOCK');

      await client.query('UPDATE inventory_item SET stock_qty=$1, updated_at=NOW() WHERE id=$2', [next, body.inventoryItemId]);
      await client.query(
        `INSERT INTO stock_movements (item_id, movement_type, quantity, reason, reference, created_at, notes)
         VALUES ($1,'ADJUSTMENT',$2,$3,$4,NOW(),$3)`,
        [body.inventoryItemId, Math.abs(Number(body.delta)), body.reason, body.performedBy || null]
      );
      return { stockQty: next };
    });
    return NextResponse.json({ success: true, data: res });
  } catch (e: any) {
    const code = e?.message === 'NEGATIVE_STOCK' || e?.message === 'RESERVED_GT_STOCK' ? 400 : 500;
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: code });
  }
}

