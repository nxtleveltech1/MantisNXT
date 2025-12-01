// src/app/api/inventory/route.ts (PUT) — batch updates
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const RowSchema = z.object({
  id: z.string().uuid(),
  stock_qty: z.number().int().optional(),
  reserved_qty: z.number().int().optional(),
  // computed/derived columns that must be ignored if present
  available_qty: z.any().optional(),
  turnover: z.any().optional(),
});

const PayloadSchema = z.object({
  rows: z.array(RowSchema),
  failFast: z.boolean().default(true),
  createMovementOnStockChange: z.boolean().default(true),
});

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { rows, failFast, createMovementOnStockChange } = parsed.data;

  try {
    await db.tx(async tx => {
      for (const r of rows) {
        const item = await tx.oneOrNone(
          'SELECT id, stock_qty, reserved_qty FROM inventory_items WHERE id=$1 FOR UPDATE',
          [r.id]
        );
        if (!item) {
          if (failFast) throw new Error(`Item ${r.id} not found`);
          continue;
        }

        // Only allow mutable columns
        const nextStock = typeof r.stock_qty === 'number' ? r.stock_qty : item.stock_qty;
        const nextReserved =
          typeof r.reserved_qty === 'number' ? r.reserved_qty : item.reserved_qty;

        if (nextStock < 0 || nextReserved < 0) {
          if (failFast) throw new Error(`Negative quantities not allowed for ${r.id}`);
          continue;
        }
        if (nextReserved > nextStock) {
          if (failFast) throw new Error(`reserved_qty > stock_qty for ${r.id}`);
          continue;
        }

        // Optionally create movement for stock change
        const delta = nextStock - item.stock_qty;
        if (createMovementOnStockChange && delta !== 0) {
          const movementType = delta > 0 ? 'ADJUST' : 'WRITE_OFF';
          await tx.none(
            'INSERT INTO stock_movements (inventory_item_id, movement_type, quantity) VALUES ($1,$2,$3)',
            [r.id, movementType, Math.abs(delta)]
          );
        }

        await tx.none('UPDATE inventory_items SET stock_qty=$1, reserved_qty=$2 WHERE id=$3', [
          nextStock,
          nextReserved,
          r.id,
        ]);
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
