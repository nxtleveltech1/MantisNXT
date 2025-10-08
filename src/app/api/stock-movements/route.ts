import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool, withTransaction } from '@/lib/database';
import { serializeTimestamp } from '@/lib/utils/date-utils';
import { CacheInvalidator } from '@/lib/cache/invalidation';

const CreateStockMovementSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(['inbound', 'outbound', 'transfer', 'adjustment']),
  quantity: z.number().positive(),
  reason: z.string().min(1),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
  performedBy: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const where: string[] = [];
    const params: any[] = [];
    if (itemId) { where.push(`sm.item_id = $${params.length + 1}`); params.push(itemId); }

    const sql = `
      SELECT sm.id, sm.item_id, sm.movement_type, sm.quantity, sm.reason, sm.reference,
             sm.location_from, sm.location_to, sm.batch_id, sm.expiry_date,
             sm.cost, sm.notes, sm.user_id, sm.created_at,
             ii.sku, ii.name
      FROM stock_movements sm
      LEFT JOIN inventory_items ii ON ii.id = sm.item_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY sm.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const { rows } = await pool.query(sql, params);
    const data = rows.map((r: any) => ({
      id: r.id,
      itemId: r.item_id,
      sku: r.sku,
      itemName: r.name,
      type: String(r.movement_type).toLowerCase(),
      quantity: Number(r.quantity || 0),
      reason: r.reason,
      reference: r.reference,
      unitCost: Number(r.cost || 0),
      createdAt: serializeTimestamp(r.created_at),
      notes: r.notes,
    }));
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'STOCK_MOVEMENTS_LIST_FAILED', detail: e?.message ?? String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateStockMovementSchema.parse(body);

    const mv = await withTransaction(async (client) => {
      const it = await client.query('SELECT id, stock_qty, reserved_qty FROM inventory_item WHERE id=$1 FOR UPDATE', [validated.itemId]);
      if (it.rowCount === 0) throw new Error('ITEM_NOT_FOUND');
      let stock = Number(it.rows[0].stock_qty);
      const reserved = Number(it.rows[0].reserved_qty);
      const qty = Number(validated.quantity);
      const t = validated.type.toLowerCase();

      if (t === 'inbound' || t === 'in') stock += qty;
      else if (t === 'outbound' || t === 'out') {
        if ((stock - reserved) < qty) throw new Error('INSUFFICIENT_AVAILABLE');
        stock -= qty;
      }

      const ins = await client.query(
        `INSERT INTO stock_movements (
           item_id, movement_type, quantity, reason, reference,
           location_from, location_to, batch_id, expiry_date,
           cost, notes, user_id, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,0),$11,$12,NOW()) RETURNING *`,
        [
          validated.itemId,
          validated.type.toUpperCase(),
          qty,
          validated.reason,
          validated.referenceNumber,
          validated.fromLocationId,
          validated.toLocationId,
          validated.batchNumber,
          validated.expiryDate,
          validated.unitCost,
          validated.notes,
          validated.performedBy,
        ]
      );
      await client.query('UPDATE inventory_item SET stock_qty=$1, updated_at=NOW() WHERE id=$2', [stock, validated.itemId]);
      return ins.rows[0];
    });

    CacheInvalidator.invalidateStockMovements(validated.itemId);
    return NextResponse.json({ success: true, data: { id: mv.id } }, { status: 201 });
  } catch (e: any) {
    const status = e?.message === 'INSUFFICIENT_AVAILABLE' ? 400 : 500;
    return NextResponse.json({ success: false, error: 'STOCK_MOVEMENTS_CREATE_FAILED', detail: e?.message ?? String(e) }, { status });
  }
}

