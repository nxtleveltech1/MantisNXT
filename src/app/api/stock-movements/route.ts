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
      SELECT sm.movement_id as id, sm.item_id, sm.type as movement_type,
             0 as quantity, '' as reason, '' as reference,
             sm.from_location_id as location_from, sm.to_location_id as location_to,
             '' as batch_id, NULL as expiry_date,
             0 as cost, '' as notes, '' as user_id, sm.timestamp as created_at,
             '' as sku, '' as name
      FROM core.stock_movements sm
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY sm.timestamp DESC
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
      // Using core.stock_movements table
      const ins = await client.query(
        `INSERT INTO core.stock_movements (
           item_id, type, from_location_id, to_location_id, timestamp
         ) VALUES ($1,$2,$3,$4,NOW()) RETURNING movement_id as id`,
        [
          validated.itemId,
          validated.type.toUpperCase(),
          validated.fromLocationId,
          validated.toLocationId,
        ]
      );
      return ins.rows[0];
    });

    CacheInvalidator.invalidateStockMovements(validated.itemId);
    return NextResponse.json({ success: true, data: { id: mv.id } }, { status: 201 });
  } catch (e: any) {
    const status = e?.message === 'INSUFFICIENT_AVAILABLE' ? 400 : 500;
    return NextResponse.json({ success: false, error: 'STOCK_MOVEMENTS_CREATE_FAILED', detail: e?.message ?? String(e) }, { status });
  }
}

