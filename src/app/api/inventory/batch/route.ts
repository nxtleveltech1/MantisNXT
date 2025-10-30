import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/database';
import { z } from 'zod';

const UpdateItemSchema = z.object({
  id: z.string().min(1),
  stock_qty: z.number().int().optional(),
  reserved_qty: z.number().int().optional(),
  cost_price: z.number().optional(),
  sale_price: z.number().optional(),
  reorder_point: z.number().int().optional(),
  max_stock_level: z.number().int().nullable().optional(),
  // any other mutable fields; generated/computed fields are intentionally omitted
});

const PayloadSchema = z.object({
  items: z.array(UpdateItemSchema),
  failFast: z.boolean().optional(),
  createMovementOnStockChange: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const body = PayloadSchema.parse(await req.json());
    const results: any[] = [];
    const errors: any[] = [];
    const failFast = body.failFast === true;
    await withTransaction(async (client) => {
      for (const item of body.items) {
        try {
          const current = await client.query('SELECT id, stock_qty, reserved_qty FROM inventory_item WHERE id=$1 FOR UPDATE', [item.id]);
          if (current.rowCount === 0) throw new Error('NOT_FOUND');
          const before = current.rows[0];

          const fields: string[] = [];
          const values: any[] = [];
          let idx = 1;
          const set = (col: string, val: any) => { fields.push(`${col} = $${idx++}`); values.push(val); };
          if (item.stock_qty !== undefined) set('stock_qty', item.stock_qty);
          if (item.reserved_qty !== undefined) set('reserved_qty', item.reserved_qty);
          if (item.cost_price !== undefined) set('cost_price', item.cost_price);
          if (item.sale_price !== undefined) set('sale_price', item.sale_price);
          if (item.reorder_point !== undefined) set('reorder_point', item.reorder_point);
          if (item.max_stock_level !== undefined) set('max_stock_level', item.max_stock_level);
          fields.push('updated_at = NOW()');
          const sql = `UPDATE inventory_item SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id`;
          values.push(item.id);
          await client.query(sql, values);

          if (body.createMovementOnStockChange && item.stock_qty !== undefined && item.stock_qty !== before.stock_qty) {
            const delta = Math.abs(Number(item.stock_qty) - Number(before.stock_qty));
            const type = Number(item.stock_qty) > Number(before.stock_qty) ? 'in' : 'out';
            await client.query(
              `INSERT INTO stock_movements (item_id, type, quantity, reason, created_at)
               VALUES ($1,$2,$3,'batch_update',NOW())`, [item.id, type, delta]
            );
          }
          results.push({ id: item.id, status: 'ok' });
        } catch (e: any) {
          const entry = { id: item.id, error: e?.message || String(e) };
          errors.push(entry);
          if (failFast) throw e;
        }
      }
    });
    return NextResponse.json({ success: errors.length === 0, results, errors }, { status: errors.length ? 207 : 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
