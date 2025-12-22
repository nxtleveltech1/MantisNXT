/**
 * Preventive Maintenance Service
 * Handles PM scheduling and tracking
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type { PreventiveMaintenance, PMLog, PMType } from '@/types/repairs';

export async function getPMById(pmId: string): Promise<PreventiveMaintenance | null> {
  const result = await query<PreventiveMaintenance>(
    `
      SELECT * FROM repairs.preventive_maintenance
      WHERE pm_id = $1
    `,
    [pmId]
  );

  return result.rows[0] || null;
}

export async function getPMByEquipment(
  equipmentId: string
): Promise<PreventiveMaintenance[]> {
  const result = await query<PreventiveMaintenance>(
    `
      SELECT * FROM repairs.preventive_maintenance
      WHERE equipment_id = $1 AND is_active = true
      ORDER BY next_due_date ASC
    `,
    [equipmentId]
  );

  return result.rows;
}

export async function getDuePMs(daysAhead = 30): Promise<PreventiveMaintenance[]> {
  const result = await query<PreventiveMaintenance>(
    `
      SELECT * FROM repairs.preventive_maintenance
      WHERE is_active = true
        AND next_due_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
      ORDER BY next_due_date ASC
    `
  );

  return result.rows;
}

export async function createPM(data: {
  equipment_id: string;
  pm_type?: PMType;
  frequency_days: number;
  next_due_date: string;
}): Promise<PreventiveMaintenance> {
  const result = await query<PreventiveMaintenance>(
    `
      INSERT INTO repairs.preventive_maintenance (
        equipment_id, pm_type, frequency_days, next_due_date, is_active
      )
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `,
    [
      data.equipment_id,
      data.pm_type || null,
      data.frequency_days,
      data.next_due_date,
    ]
  );

  return result.rows[0];
}

export async function logPM(data: {
  pm_id: string;
  performed_date: string;
  performed_by?: string;
  findings?: string;
  actions_taken?: string;
  parts_replaced?: string[];
  cost?: number;
  notes?: string;
}): Promise<PMLog> {
  return await withTransaction(async (client) => {
    // Create PM log
    const logResult = await client.query<PMLog>(
      `
        INSERT INTO repairs.pm_logs (
          pm_id, performed_date, performed_by, findings, actions_taken,
          parts_replaced, cost, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        data.pm_id,
        data.performed_date,
        data.performed_by || null,
        data.findings || null,
        data.actions_taken || null,
        data.parts_replaced || null,
        data.cost || 0,
        data.notes || null,
      ]
    );

    const log = logResult.rows[0];

    // Update PM schedule with next due date
    const pm = await client.query(
      'SELECT frequency_days FROM repairs.preventive_maintenance WHERE pm_id = $1',
      [data.pm_id]
    );

    if (pm.rows.length > 0) {
      const frequencyDays = pm.rows[0].frequency_days;
      const nextDueDate = new Date(data.performed_date);
      nextDueDate.setDate(nextDueDate.getDate() + frequencyDays);

      await client.query(
        `
          UPDATE repairs.preventive_maintenance
          SET last_performed_date = $1,
              next_due_date = $2
          WHERE pm_id = $3
        `,
        [data.performed_date, nextDueDate.toISOString().split('T')[0], data.pm_id]
      );
    }

    return log;
  });
}

export async function getPMLogs(pmId: string): Promise<PMLog[]> {
  const result = await query<PMLog>(
    `
      SELECT * FROM repairs.pm_logs
      WHERE pm_id = $1
      ORDER BY performed_date DESC
    `,
    [pmId]
  );

  return result.rows;
}

export async function updatePM(
  pmId: string,
  updates: Partial<{
    frequency_days: number;
    next_due_date: string;
    is_active: boolean;
  }>
): Promise<PreventiveMaintenance> {
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
    const pm = await getPMById(pmId);
    if (!pm) {
      throw new Error('PM schedule not found');
    }
    return pm;
  }

  params.push(pmId);

  const sql = `
    UPDATE repairs.preventive_maintenance
    SET ${updateFields.join(', ')}
    WHERE pm_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<PreventiveMaintenance>(sql, params);

  if (result.rows.length === 0) {
    throw new Error('PM schedule not found');
  }

  return result.rows[0];
}

