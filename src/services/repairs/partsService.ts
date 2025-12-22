/**
 * Parts Inventory Service
 * Handles workshop parts inventory management
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type { PartsInventory } from '@/types/repairs';

export async function getPartById(partId: string): Promise<PartsInventory | null> {
  const result = await query<PartsInventory>(
    `
      SELECT * FROM repairs.parts_inventory
      WHERE part_id = $1
    `,
    [partId]
  );

  return result.rows[0] || null;
}

export async function getPartByProductId(
  productId: string,
  locationId?: string
): Promise<PartsInventory | null> {
  let sql = `
    SELECT * FROM repairs.parts_inventory
    WHERE product_id = $1
  `;
  const params: unknown[] = [productId];

  if (locationId) {
    sql += ` AND location_id = $2`;
    params.push(locationId);
  } else {
    sql += ` AND location_id IS NULL`;
  }

  const result = await query<PartsInventory>(sql, params);
  return result.rows[0] || null;
}

export async function listParts(filters?: {
  location_id?: string;
  low_stock_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PartsInventory[]> {
  let sql = 'SELECT * FROM repairs.parts_inventory WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.location_id) {
    sql += ` AND location_id = $${paramIndex++}`;
    params.push(filters.location_id);
  }

  if (filters?.low_stock_only) {
    sql += ` AND quantity_available <= reorder_point`;
  }

  sql += ' ORDER BY product_id';

  if (filters?.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  if (filters?.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(filters.offset);
  }

  const result = await query<PartsInventory>(sql, params);
  return result.rows;
}

export async function adjustPartsStock(
  productId: string,
  delta: number,
  locationId?: string
): Promise<PartsInventory> {
  return await withTransaction(async (client) => {
    // Get or create parts inventory record
    let part = await getPartByProductId(productId, locationId);

    if (!part) {
      // Create new parts inventory record
      const createResult = await client.query<PartsInventory>(
        `
          INSERT INTO repairs.parts_inventory (
            product_id, location_id, quantity_on_hand, quantity_reserved
          )
          VALUES ($1, $2, GREATEST(0, $3), 0)
          RETURNING *
        `,
        [productId, locationId || null, delta]
      );

      part = createResult.rows[0];
    } else {
      // Update existing record
      const updateResult = await client.query<PartsInventory>(
        `
          UPDATE repairs.parts_inventory
          SET quantity_on_hand = GREATEST(0, quantity_on_hand + $1),
              last_used_date = CASE WHEN $1 < 0 THEN CURRENT_DATE ELSE last_used_date END,
              last_received_date = CASE WHEN $1 > 0 THEN CURRENT_DATE ELSE last_received_date END,
              updated_at = NOW()
          WHERE part_id = $2
          RETURNING *
        `,
        [delta, part.part_id]
      );

      part = updateResult.rows[0];
    }

    return part;
  });
}

export async function reserveParts(
  productId: string,
  quantity: number,
  locationId?: string
): Promise<PartsInventory> {
  return await withTransaction(async (client) => {
    const part = await getPartByProductId(productId, locationId);

    if (!part) {
      throw new Error('Part not found in inventory');
    }

    if (part.quantity_available < quantity) {
      throw new Error(`Insufficient stock. Available: ${part.quantity_available}, Requested: ${quantity}`);
    }

    const result = await client.query<PartsInventory>(
      `
        UPDATE repairs.parts_inventory
        SET quantity_reserved = quantity_reserved + $1,
            updated_at = NOW()
        WHERE part_id = $2
        RETURNING *
      `,
      [quantity, part.part_id]
    );

    return result.rows[0];
  });
}

export async function releaseReservedParts(
  productId: string,
  quantity: number,
  locationId?: string
): Promise<PartsInventory> {
  return await withTransaction(async (client) => {
    const part = await getPartByProductId(productId, locationId);

    if (!part) {
      throw new Error('Part not found in inventory');
    }

    const result = await client.query<PartsInventory>(
      `
        UPDATE repairs.parts_inventory
        SET quantity_reserved = GREATEST(0, quantity_reserved - $1),
            updated_at = NOW()
        WHERE part_id = $2
        RETURNING *
      `,
      [quantity, part.part_id]
    );

    return result.rows[0];
  });
}

export async function consumeParts(
  productId: string,
  quantity: number,
  locationId?: string
): Promise<PartsInventory> {
  return await withTransaction(async (client) => {
    // First release reserved parts, then reduce on-hand
    const part = await getPartByProductId(productId, locationId);

    if (!part) {
      throw new Error('Part not found in inventory');
    }

    // Release reserved quantity
    const reservedToRelease = Math.min(quantity, part.quantity_reserved);
    const remainingToConsume = quantity - reservedToRelease;

    await client.query(
      `
        UPDATE repairs.parts_inventory
        SET quantity_reserved = quantity_reserved - $1,
            quantity_on_hand = GREATEST(0, quantity_on_hand - $2),
            last_used_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE part_id = $3
      `,
      [reservedToRelease, remainingToConsume, part.part_id]
    );

    const updated = await getPartById(part.part_id);
    if (!updated) {
      throw new Error('Failed to update parts inventory');
    }

    return updated;
  });
}

export async function updateReorderPoint(
  productId: string,
  reorderPoint: number,
  locationId?: string
): Promise<PartsInventory> {
  const part = await getPartByProductId(productId, locationId);

  if (!part) {
    throw new Error('Part not found in inventory');
  }

  const result = await query<PartsInventory>(
    `
      UPDATE repairs.parts_inventory
      SET reorder_point = $1,
          updated_at = NOW()
      WHERE part_id = $2
      RETURNING *
    `,
    [reorderPoint, part.part_id]
  );

  return result.rows[0];
}

