// src/app/api/inventory/adjustments/route.ts
// Phase 5: Inventory Adjustments endpoint
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db'; // your DB client
import { validateAdjustment, assertSaneQuantities } from './validation';
import { sql } from '@/lib/sql'; // if using a tagged template helper

const AdjustmentSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: z.string().min(2),
  movementType: z.enum(['ADJUST', 'WRITE_OFF', 'IN', 'OUT']).default('ADJUST'),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = AdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { inventoryItemId, quantity, reason, movementType } = parsed.data;

  return db.tx(async tx => {
    // Lock item for update
    const item = await tx.oneOrNone(
      `SELECT id, stock_qty, reserved_qty FROM inventory_items WHERE id = $1 FOR UPDATE`,
      [inventoryItemId]
    );
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    assertSaneQuantities(item.stock_qty, item.reserved_qty);
    const delta =
      movementType === 'IN'
        ? quantity
        : movementType === 'OUT' || movementType === 'WRITE_OFF'
          ? -quantity
          : quantity; // ADJUST defaults to +quantity

    // Validate we won’t go negative or below reserved
    await validateAdjustment({ currentStock: item.stock_qty, reserved: item.reserved_qty, delta });

    // Insert movement then update item within same transaction
    await tx.none(
      `INSERT INTO stock_movements (inventory_item_id, movement_type, quantity)
       VALUES ($1, $2, $3)`,
      [inventoryItemId, movementType, Math.abs(quantity)]
    );

    await tx.none(`UPDATE inventory_items SET stock_qty = stock_qty + $1 WHERE id = $2`, [
      delta,
      inventoryItemId,
    ]);

    return NextResponse.json({ ok: true });
  });
}
