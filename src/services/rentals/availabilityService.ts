/**
 * Availability Service
 * Handles equipment availability calculations
 */

import { query } from '@/lib/database/unified-connection';
import type { AvailabilityCheck } from '@/types/rentals';

export interface AvailabilityResult {
  equipment_id: string;
  available: boolean;
  conflicting_reservations: Array<{
    reservation_id: string;
    reservation_number: string;
    rental_start_date: string;
    rental_end_date: string;
  }>;
}

export async function checkAvailability(
  check: AvailabilityCheck
): Promise<AvailabilityResult> {
  // Find all reservations that overlap with the requested dates
  const overlappingReservations = await query<{
    reservation_id: string;
    reservation_number: string;
    rental_start_date: string;
    rental_end_date: string;
  }>(
    `
      SELECT DISTINCT r.reservation_id, r.reservation_number, r.rental_start_date, r.rental_end_date
      FROM rentals.reservations r
      INNER JOIN rentals.reservation_items ri ON r.reservation_id = ri.reservation_id
      WHERE ri.equipment_id = $1
        AND r.status IN ('pending', 'confirmed', 'picked_up', 'active')
        AND (
          (r.rental_start_date <= $2 AND r.rental_end_date >= $2)
          OR (r.rental_start_date <= $3 AND r.rental_end_date >= $3)
          OR (r.rental_start_date >= $2 AND r.rental_end_date <= $3)
        )
    `,
    [check.equipment_id, check.start_date, check.end_date]
  );

  // Check equipment availability status
  const equipment = await query<{ availability_status: string }>(
    `
      SELECT availability_status
      FROM rentals.equipment
      WHERE equipment_id = $1
    `,
    [check.equipment_id]
  );

  const isAvailable =
    equipment.rows.length > 0 &&
    equipment.rows[0].availability_status === 'available' &&
    overlappingReservations.rows.length === 0;

  return {
    equipment_id: check.equipment_id,
    available: isAvailable,
    conflicting_reservations: overlappingReservations.rows,
  };
}

export async function checkMultipleAvailability(
  checks: AvailabilityCheck[]
): Promise<AvailabilityResult[]> {
  return Promise.all(checks.map((check) => checkAvailability(check)));
}

export async function getAvailableEquipment(
  startDate: string,
  endDate: string,
  equipmentType?: string
): Promise<Array<{ equipment_id: string; name: string; sku: string }>> {
  let sql = `
    SELECT DISTINCT e.equipment_id, e.name, e.sku
    FROM rentals.equipment e
    WHERE e.availability_status = 'available'
      AND e.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM rentals.reservation_items ri
        INNER JOIN rentals.reservations r ON ri.reservation_id = r.reservation_id
        WHERE ri.equipment_id = e.equipment_id
          AND r.status IN ('pending', 'confirmed', 'picked_up', 'active')
          AND (
            (r.rental_start_date <= $1 AND r.rental_end_date >= $1)
            OR (r.rental_start_date <= $2 AND r.rental_end_date >= $2)
            OR (r.rental_start_date >= $1 AND r.rental_end_date <= $2)
          )
      )
  `;

  const params: unknown[] = [startDate, endDate];

  if (equipmentType) {
    sql += ` AND e.equipment_type = $3`;
    params.push(equipmentType);
  }

  sql += ` ORDER BY e.name`;

  const result = await query<{ equipment_id: string; name: string; sku: string }>(
    sql,
    params
  );

  return result.rows;
}

