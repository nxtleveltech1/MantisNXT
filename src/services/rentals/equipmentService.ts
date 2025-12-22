/**
 * AV Equipment Service
 * Handles CRUD operations for rental equipment
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type {
  Equipment,
  CreateEquipmentInput,
  EquipmentCondition,
  EquipmentAvailabilityStatus,
} from '@/types/rentals';

export async function getEquipmentById(equipmentId: string): Promise<Equipment | null> {
  const result = await query<Equipment>(
    `
      SELECT * FROM rentals.equipment
      WHERE equipment_id = $1
    `,
    [equipmentId]
  );

  return result.rows[0] || null;
}

export async function getEquipmentBySku(sku: string): Promise<Equipment | null> {
  const result = await query<Equipment>(
    `
      SELECT * FROM rentals.equipment
      WHERE sku = $1
    `,
    [sku]
  );

  return result.rows[0] || null;
}

export async function listEquipment(filters?: {
  equipment_type?: string;
  availability_status?: EquipmentAvailabilityStatus;
  category_id?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Equipment[]> {
  let sql = 'SELECT * FROM rentals.equipment WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.equipment_type) {
    sql += ` AND equipment_type = $${paramIndex++}`;
    params.push(filters.equipment_type);
  }

  if (filters?.availability_status) {
    sql += ` AND availability_status = $${paramIndex++}`;
    params.push(filters.availability_status);
  }

  if (filters?.category_id) {
    sql += ` AND category_id = $${paramIndex++}`;
    params.push(filters.category_id);
  }

  if (filters?.is_active !== undefined) {
    sql += ` AND is_active = $${paramIndex++}`;
    params.push(filters.is_active);
  }

  sql += ' ORDER BY name ASC';

  if (filters?.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  if (filters?.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(filters.offset);
  }

  const result = await query<Equipment>(sql, params);
  return result.rows;
}

export async function createEquipment(
  input: CreateEquipmentInput,
  createdBy: string
): Promise<Equipment> {
  return await withTransaction(async (client) => {
    // Check if SKU already exists
    const existing = await client.query(
      'SELECT equipment_id FROM rentals.equipment WHERE sku = $1',
      [input.sku]
    );

    if (existing.rows.length > 0) {
      throw new Error(`Equipment with SKU ${input.sku} already exists`);
    }

    const result = await client.query<Equipment>(
      `
        INSERT INTO rentals.equipment (
          sku, name, equipment_type, category_id, brand, model, serial_number,
          barcode, rental_rate_daily, rental_rate_weekly, rental_rate_monthly,
          security_deposit, technical_specs, compatibility_info, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
        RETURNING *
      `,
      [
        input.sku,
        input.name,
        input.equipment_type,
        input.category_id || null,
        input.brand || null,
        input.model || null,
        input.serial_number || null,
        input.barcode || null,
        input.rental_rate_daily || null,
        input.rental_rate_weekly || null,
        input.rental_rate_monthly || null,
        input.security_deposit || null,
        input.technical_specs ? JSON.stringify(input.technical_specs) : null,
        input.compatibility_info ? JSON.stringify(input.compatibility_info) : null,
      ]
    );

    return result.rows[0];
  });
}

export async function updateEquipment(
  equipmentId: string,
  updates: Partial<{
    name: string;
    equipment_type: string;
    condition_status: EquipmentCondition;
    availability_status: EquipmentAvailabilityStatus;
    current_location_id: string;
    rental_rate_daily: number;
    rental_rate_weekly: number;
    rental_rate_monthly: number;
    security_deposit: number;
    technical_specs: Record<string, unknown>;
    compatibility_info: Record<string, unknown>;
    next_maintenance_due: string;
    is_active: boolean;
  }>
): Promise<Equipment> {
  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'technical_specs' || key === 'compatibility_info') {
        updateFields.push(`${key} = $${paramIndex++}`);
        params.push(JSON.stringify(value));
      } else {
        updateFields.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    }
  });

  if (updateFields.length === 0) {
    const equipment = await getEquipmentById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    return equipment;
  }

  updateFields.push(`updated_at = NOW()`);
  params.push(equipmentId);

  const sql = `
    UPDATE rentals.equipment
    SET ${updateFields.join(', ')}
    WHERE equipment_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<Equipment>(sql, params);

  if (result.rows.length === 0) {
    throw new Error('Equipment not found');
  }

  return result.rows[0];
}

export async function deleteEquipment(equipmentId: string): Promise<void> {
  const result = await query(
    'DELETE FROM rentals.equipment WHERE equipment_id = $1',
    [equipmentId]
  );

  if (result.rowCount === 0) {
    throw new Error('Equipment not found');
  }
}

export async function updateEquipmentCondition(
  equipmentId: string,
  condition: EquipmentCondition,
  notes?: string
): Promise<Equipment> {
  return updateEquipment(equipmentId, {
    condition_status: condition,
    condition_notes: notes,
  });
}

export async function updateEquipmentAvailability(
  equipmentId: string,
  status: EquipmentAvailabilityStatus
): Promise<Equipment> {
  return updateEquipment(equipmentId, {
    availability_status: status,
  });
}

