/**
 * Repair Order Service
 * Handles repair order management
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type {
  RepairOrder,
  RepairOrderItem,
  CreateRepairOrderInput,
  UpdateRepairOrderInput,
  RepairOrderStatus,
} from '@/types/repairs';
import { generateRepairOrderNumber } from '@/lib/utils/repair-order-number';

export async function getRepairOrderById(repairOrderId: string): Promise<RepairOrder | null> {
  const result = await query<RepairOrder>(
    `
      SELECT * FROM repairs.repair_orders
      WHERE repair_order_id = $1
    `,
    [repairOrderId]
  );

  return result.rows[0] || null;
}

export async function getRepairOrderByNumber(
  repairOrderNumber: string
): Promise<RepairOrder | null> {
  const result = await query<RepairOrder>(
    `
      SELECT * FROM repairs.repair_orders
      WHERE repair_order_number = $1
    `,
    [repairOrderNumber]
  );

  return result.rows[0] || null;
}

export async function listRepairOrders(filters?: {
  equipment_id?: string;
  customer_id?: string;
  status?: RepairOrderStatus;
  assigned_technician_id?: string;
  order_type?: string;
  limit?: number;
  offset?: number;
}): Promise<RepairOrder[]> {
  let sql = 'SELECT * FROM repairs.repair_orders WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.equipment_id) {
    sql += ` AND equipment_id = $${paramIndex++}`;
    params.push(filters.equipment_id);
  }

  if (filters?.customer_id) {
    sql += ` AND customer_id = $${paramIndex++}`;
    params.push(filters.customer_id);
  }

  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters?.assigned_technician_id) {
    sql += ` AND assigned_technician_id = $${paramIndex++}`;
    params.push(filters.assigned_technician_id);
  }

  if (filters?.order_type) {
    sql += ` AND order_type = $${paramIndex++}`;
    params.push(filters.order_type);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  if (filters?.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(filters.offset);
  }

  const result = await query<RepairOrder>(sql, params);
  return result.rows;
}

export async function getRepairOrderItems(repairOrderId: string): Promise<RepairOrderItem[]> {
  const result = await query<RepairOrderItem>(
    `
      SELECT * FROM repairs.repair_order_items
      WHERE repair_order_id = $1
      ORDER BY repair_item_id
    `,
    [repairOrderId]
  );

  return result.rows;
}

export async function createRepairOrder(
  input: CreateRepairOrderInput,
  createdBy: string
): Promise<RepairOrder> {
  return await withTransaction(async (client) => {
    // Generate repair order number
    const repairOrderNumber = await generateRepairOrderNumber();

    // Create repair order
    const result = await client.query<RepairOrder>(
      `
        INSERT INTO repairs.repair_orders (
          repair_order_number, equipment_id, customer_id, order_type,
          priority, status, reported_issue, assigned_technician_id,
          estimated_completion_date, created_by
        )
        VALUES ($1, $2, $3, $4, $5, 'received', $6, $7, $8, $9)
        RETURNING *
      `,
      [
        repairOrderNumber,
        input.equipment_id || null,
        input.customer_id || null,
        input.order_type,
        input.priority || 'normal',
        input.reported_issue,
        input.assigned_technician_id || null,
        input.estimated_completion_date || null,
        createdBy,
      ]
    );

    return result.rows[0];
  });
}

export async function updateRepairOrder(
  repairOrderId: string,
  updates: UpdateRepairOrderInput
): Promise<RepairOrder> {
  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      updateFields.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  });

  if (updateFields.length === 0) {
    const order = await getRepairOrderById(repairOrderId);
    if (!order) {
      throw new Error('Repair order not found');
    }
    return order;
  }

  // Update status change timestamp
  if (updates.status) {
    updateFields.push(`actual_start_date = CASE WHEN $${paramIndex} = 'in_progress' AND actual_start_date IS NULL THEN CURRENT_DATE ELSE actual_start_date END`);
    params.push(updates.status);
    paramIndex++;

    updateFields.push(`actual_completion_date = CASE WHEN $${paramIndex} = 'completed' THEN CURRENT_DATE ELSE actual_completion_date END`);
    params.push(updates.status);
    paramIndex++;
  }

  updateFields.push(`updated_at = NOW()`);
  params.push(repairOrderId);

  const sql = `
    UPDATE repairs.repair_orders
    SET ${updateFields.join(', ')}
    WHERE repair_order_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<RepairOrder>(sql, params);

  if (result.rows.length === 0) {
    throw new Error('Repair order not found');
  }

  return result.rows[0];
}

export async function addDiagnosis(
  repairOrderId: string,
  diagnosedBy: string,
  diagnosis: string
): Promise<RepairOrder> {
  return updateRepairOrder(repairOrderId, {
    status: 'diagnosed',
    diagnosis,
    diagnosed_by: diagnosedBy,
    diagnosed_at: new Date().toISOString(),
  });
}

export async function assignTechnician(
  repairOrderId: string,
  technicianId: string
): Promise<RepairOrder> {
  return updateRepairOrder(repairOrderId, {
    assigned_technician_id: technicianId,
    status: 'in_progress',
  });
}

export async function addRepairOrderItem(
  repairOrderId: string,
  item: {
    part_id?: string;
    part_name?: string;
    quantity: number;
    unit_cost?: number;
    notes?: string;
  }
): Promise<RepairOrderItem> {
  return await withTransaction(async (client) => {
    const lineTotal = (item.unit_cost || 0) * item.quantity;

    const result = await client.query<RepairOrderItem>(
      `
        INSERT INTO repairs.repair_order_items (
          repair_order_id, part_id, part_name, quantity, unit_cost, line_total, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        repairOrderId,
        item.part_id || null,
        item.part_name || null,
        item.quantity,
        item.unit_cost || null,
        lineTotal,
        item.notes || null,
      ]
    );

    // Update repair order totals
    await client.query(
      `
        UPDATE repairs.repair_orders
        SET parts_cost = (
          SELECT COALESCE(SUM(line_total), 0)
          FROM repairs.repair_order_items
          WHERE repair_order_id = $1
        ),
        total_cost = labor_cost + (
          SELECT COALESCE(SUM(line_total), 0)
          FROM repairs.repair_order_items
          WHERE repair_order_id = $1
        )
        WHERE repair_order_id = $1
      `,
      [repairOrderId]
    );

    return result.rows[0];
  });
}

export async function updateLaborHours(
  repairOrderId: string,
  laborHours: number,
  hourlyRate?: number
): Promise<RepairOrder> {
  return await withTransaction(async (client) => {
    // Get technician hourly rate if not provided
    let rate = hourlyRate;
    if (!rate) {
      const order = await client.query(
        'SELECT assigned_technician_id FROM repairs.repair_orders WHERE repair_order_id = $1',
        [repairOrderId]
      );

      if (order.rows[0]?.assigned_technician_id) {
        const tech = await client.query(
          'SELECT hourly_rate FROM repairs.technicians WHERE technician_id = $1',
          [order.rows[0].assigned_technician_id]
        );
        rate = tech.rows[0]?.hourly_rate || 0;
      } else {
        rate = 0;
      }
    }

    const laborCost = laborHours * rate;

    await client.query(
      `
        UPDATE repairs.repair_orders
        SET labor_hours = $1,
            labor_cost = $2,
            total_cost = $2 + parts_cost
        WHERE repair_order_id = $3
      `,
      [laborHours, laborCost, repairOrderId]
    );

    const updated = await getRepairOrderById(repairOrderId);
    if (!updated) {
      throw new Error('Repair order not found');
    }
    return updated;
  });
}

export async function completeRepairOrder(repairOrderId: string): Promise<RepairOrder> {
  return updateRepairOrder(repairOrderId, {
    status: 'completed',
  });
}

