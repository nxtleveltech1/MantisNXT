/**
 * Technician Service
 * Handles technician management
 */

import { query } from '@/lib/database/unified-connection';
import type { Technician } from '@/types/repairs';

export async function getTechnicianById(technicianId: string): Promise<Technician | null> {
  const result = await query<Technician>(
    `
      SELECT * FROM repairs.technicians
      WHERE technician_id = $1
    `,
    [technicianId]
  );

  return result.rows[0] || null;
}

export async function getTechnicianByUserId(userId: string): Promise<Technician | null> {
  const result = await query<Technician>(
    `
      SELECT * FROM repairs.technicians
      WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

export async function listTechnicians(activeOnly = true): Promise<Technician[]> {
  let sql = 'SELECT * FROM repairs.technicians';
  const params: unknown[] = [];

  if (activeOnly) {
    sql += ' WHERE is_active = true';
  }

  sql += ' ORDER BY employee_number, technician_id';

  const result = await query<Technician>(sql, params);
  return result.rows;
}

export async function getTechniciansBySpecialization(
  specialization: string
): Promise<Technician[]> {
  const result = await query<Technician>(
    `
      SELECT * FROM repairs.technicians
      WHERE is_active = true
        AND $1 = ANY(specializations)
      ORDER BY employee_number
    `,
    [specialization]
  );

  return result.rows;
}

export async function createTechnician(data: {
  user_id?: string;
  employee_number?: string;
  specializations?: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    expiry_date?: string;
  }>;
  hourly_rate?: number;
}): Promise<Technician> {
  const result = await query<Technician>(
    `
      INSERT INTO repairs.technicians (
        user_id, employee_number, specializations, certifications, hourly_rate, is_active
      )
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `,
    [
      data.user_id || null,
      data.employee_number || null,
      data.specializations || null,
      data.certifications ? JSON.stringify(data.certifications) : null,
      data.hourly_rate || null,
    ]
  );

  return result.rows[0];
}

export async function updateTechnician(
  technicianId: string,
  updates: Partial<{
    specializations: string[];
    certifications: Array<{
      name: string;
      issuer: string;
      expiry_date?: string;
    }>;
    hourly_rate: number;
    is_active: boolean;
  }>
): Promise<Technician> {
  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'certifications') {
        updateFields.push(`${key} = $${paramIndex++}`);
        params.push(JSON.stringify(value));
      } else {
        updateFields.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    }
  });

  if (updateFields.length === 0) {
    const technician = await getTechnicianById(technicianId);
    if (!technician) {
      throw new Error('Technician not found');
    }
    return technician;
  }

  params.push(technicianId);

  const sql = `
    UPDATE repairs.technicians
    SET ${updateFields.join(', ')}
    WHERE technician_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<Technician>(sql, params);

  if (result.rows.length === 0) {
    throw new Error('Technician not found');
  }

  return result.rows[0];
}

