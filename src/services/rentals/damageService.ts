/**
 * Damage Service
 * Handles damage reporting and assessment
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type {
  DamageReport,
  DamageType,
  DamageSeverity,
  DamageReportStatus,
} from '@/types/rentals';

export async function createDamageReport(
  reservationId: string,
  equipmentId: string,
  reportedBy: string,
  data: {
    damage_type?: DamageType;
    damage_description: string;
    severity?: DamageSeverity;
    photos?: string[];
  }
): Promise<DamageReport> {
  return await withTransaction(async (client) => {
    // Create damage report
    const result = await client.query<DamageReport>(
      `
        INSERT INTO rentals.damage_reports (
          reservation_id, equipment_id, reported_by, damage_type,
          damage_description, severity, photos, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'reported')
        RETURNING *
      `,
      [
        reservationId,
        equipmentId,
        reportedBy,
        data.damage_type || null,
        data.damage_description,
        data.severity || null,
        data.photos || null,
      ]
    );

    // Update reservation item damage flag
    await client.query(
      `
        UPDATE rentals.reservation_items
        SET damage_assessed = true
        WHERE reservation_id = $1 AND equipment_id = $2
      `,
      [reservationId, equipmentId]
    );

    return result.rows[0];
  });
}

export async function assessDamage(
  damageReportId: string,
  assessedBy: string,
  assessment: {
    repair_cost_estimate?: number;
    replacement_cost?: number;
    final_cost?: number;
    customer_liable?: boolean;
    insurance_claim_filed?: boolean;
    insurance_claim_number?: string;
    notes?: string;
  }
): Promise<DamageReport> {
  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  updateFields.push(`assessed_by = $${paramIndex++}`);
  params.push(assessedBy);

  updateFields.push(`assessed_at = NOW()`);
  updateFields.push(`status = 'assessed'`);

  Object.entries(assessment).forEach(([key, value]) => {
    if (value !== undefined) {
      updateFields.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  });

  params.push(damageReportId);

  const sql = `
    UPDATE rentals.damage_reports
    SET ${updateFields.join(', ')}
    WHERE damage_report_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<DamageReport>(sql, params);

  if (result.rows.length === 0) {
    throw new Error('Damage report not found');
  }

  return result.rows[0];
}

export async function getDamageReportById(
  damageReportId: string
): Promise<DamageReport | null> {
  const result = await query<DamageReport>(
    `
      SELECT * FROM rentals.damage_reports
      WHERE damage_report_id = $1
    `,
    [damageReportId]
  );

  return result.rows[0] || null;
}

export async function getDamageReportsByReservation(
  reservationId: string
): Promise<DamageReport[]> {
  const result = await query<DamageReport>(
    `
      SELECT * FROM rentals.damage_reports
      WHERE reservation_id = $1
      ORDER BY reported_at DESC
    `,
    [reservationId]
  );

  return result.rows;
}

export async function updateDamageReportStatus(
  damageReportId: string,
  status: DamageReportStatus
): Promise<DamageReport> {
  const result = await query<DamageReport>(
    `
      UPDATE rentals.damage_reports
      SET status = $1
      WHERE damage_report_id = $2
      RETURNING *
    `,
    [status, damageReportId]
  );

  if (result.rows.length === 0) {
    throw new Error('Damage report not found');
  }

  return result.rows[0];
}

