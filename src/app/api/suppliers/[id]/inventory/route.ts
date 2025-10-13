import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/database';

type Action = 'allocate_to_supplier' | 'deallocate_from_supplier' | 'transfer_allocation' | 'consignment_in' | 'consignment_out';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: supplierId } = await context.params;
  try {
    const body = await req.json();
    const action: Action = body?.action;
    const itemId: string = body?.inventoryItemId;
    const qty: number = Number(body?.quantity || 0);
    const orgId: string = body?.orgId;
    const expiresAt: string | undefined = body?.expiresAt;
    const notes: string | undefined = body?.notes;

    if (!supplierId || !itemId || !action || !(qty > 0) || !orgId) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    }

    const out = await withTransaction(async (client) => {
      const it = await client.query(`SELECT id, stock_qty, reserved_qty FROM inventory_item WHERE id=$1 FOR UPDATE`, [itemId]);
      if (it.rowCount === 0) throw new Error('ITEM_NOT_FOUND');
      const row = it.rows[0];

      const ensureQty = (n: number) => { if (!Number.isFinite(n) || n < 0) throw new Error('INVALID_QTY'); };
      ensureQty(qty);
      let newStock = Number(row.stock_qty);
      let newReserved = Number(row.reserved_qty);

      switch (action) {
        case 'allocate_to_supplier':
          if (newStock - newReserved < qty) throw new Error('INSUFFICIENT_AVAILABLE');
          newReserved += qty;
          await client.query(`INSERT INTO inventory_allocations (org_id, inventory_item_id, supplier_id, allocation_type, allocated_qty, expires_at, notes)
                              VALUES ($1,$2,$3,'allocation',$4,$5,$6)`, [orgId, itemId, supplierId, qty, expiresAt || null, notes || null]);
          await client.query(`INSERT INTO stock_movements (item_id, movement_type, quantity, reason, reference, timestamp)
                              VALUES ($1,'adjustment',$2,'allocate_to_supplier',$3,NOW())`, [itemId, qty, supplierId]);
          break;
        case 'deallocate_from_supplier':
          newReserved = Math.max(0, newReserved - qty);
          await client.query(`INSERT INTO stock_movements (item_id, movement_type, quantity, reason, reference, timestamp)
                              VALUES ($1,'adjustment',-$2,'deallocate_from_supplier',$3,NOW())`, [itemId, qty, supplierId]);
          break;
        case 'transfer_allocation':
          // no stock change, audit only
          await client.query(`INSERT INTO stock_movements (item_id, movement_type, quantity, reason, reference, timestamp)
                              VALUES ($1,'transfer',0,'transfer_allocation',$2,NOW())`, [itemId, `${supplierId}->${body?.toSupplierId}`]);
          break;
        case 'consignment_in':
          newStock += qty;
          await client.query(`INSERT INTO inventory_allocations (org_id, inventory_item_id, supplier_id, allocation_type, allocated_qty, expires_at, notes)
                              VALUES ($1,$2,$3,'consignment',$4,$5,$6)`, [orgId, itemId, supplierId, qty, expiresAt || null, notes || null]);
          await client.query(`INSERT INTO stock_movements (item_id, movement_type, quantity, reason, reference, timestamp)
                              VALUES ($1,'inbound',$2,'consignment_in',$3,NOW())`, [itemId, qty, supplierId]);
          break;
        case 'consignment_out':
          if (newStock - newReserved < qty) throw new Error('INSUFFICIENT_AVAILABLE');
          newStock -= qty;
          await client.query(`INSERT INTO stock_movements (item_id, movement_type, quantity, reason, reference, timestamp)
                              VALUES ($1,'outbound',$2,'consignment_out',$3,NOW())`, [itemId, qty, supplierId]);
          break;
      }

      if (newReserved > newStock) throw new Error('RESERVED_GT_STOCK');
      await client.query(`UPDATE inventory_item SET stock_qty=$1, reserved_qty=$2, updated_at=NOW() WHERE id=$3`, [newStock, newReserved, itemId]);
      return { stockQty: newStock, reservedQty: newReserved };
    });

    return NextResponse.json({ success: true, data: out });
  } catch (e: any) {
    const msg = e?.message || String(e);
    return NextResponse.json({ success: false, error: 'ALLOCATION_FAILED', detail: msg }, { status: 400 });
  }
}
