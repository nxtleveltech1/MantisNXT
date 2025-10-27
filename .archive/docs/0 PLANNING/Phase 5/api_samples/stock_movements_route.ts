
// src/app/api/stock-movements/route.ts
// Ensure movement creation and inventory sync are atomic
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const MovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  movementType: z.enum(['IN','OUT','ADJUST','TRANSFER','CONSIGNMENT_IN','CONSIGNMENT_OUT','WRITE_OFF']),
  quantity: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = MovementSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { inventoryItemId, movementType, quantity } = parsed.data

  return db.tx(async (tx) => {
    const item = await tx.oneOrNone(
      'SELECT id, stock_qty, reserved_qty FROM inventory_items WHERE id=$1 FOR UPDATE',
      [inventoryItemId]
    )
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const delta = (movementType === 'IN' || movementType === 'CONSIGNMENT_IN') ? quantity
                : (movementType === 'OUT' || movementType === 'CONSIGNMENT_OUT' || movementType === 'WRITE_OFF' || movementType === 'TRANSFER') ? -quantity
                : quantity

    // Guardrails
    const newStock = item.stock_qty + delta
    if (newStock < 0 || item.reserved_qty > newStock) {
      return NextResponse.json({ error: 'Insufficient stock or reserved exceeds resulting stock' }, { status: 409 })
    }

    await tx.none(
      'INSERT INTO stock_movements (inventory_item_id, movement_type, quantity) VALUES ($1,$2,$3)',
      [inventoryItemId, movementType, quantity]
    )
    await tx.none(
      'UPDATE inventory_items SET stock_qty = stock_qty + $1 WHERE id = $2',
      [delta, inventoryItemId]
    )

    return NextResponse.json({ ok: true })
  })
}
