/**
 * Reservation Service
 * Handles rental reservation management
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type {
  Reservation,
  ReservationItem,
  CreateReservationInput,
  ReservationStatus,
} from '@/types/rentals';
import { generateReservationNumber } from '@/lib/utils/reservation-number';

export async function getReservationById(reservationId: string): Promise<Reservation | null> {
  const result = await query<Reservation>(
    `
      SELECT * FROM rentals.reservations
      WHERE reservation_id = $1
    `,
    [reservationId]
  );

  return result.rows[0] || null;
}

export async function getReservationByNumber(
  reservationNumber: string
): Promise<Reservation | null> {
  const result = await query<Reservation>(
    `
      SELECT * FROM rentals.reservations
      WHERE reservation_number = $1
    `,
    [reservationNumber]
  );

  return result.rows[0] || null;
}

export async function listReservations(filters?: {
  customer_id?: string;
  status?: ReservationStatus;
  rental_start_date_from?: string;
  rental_start_date_to?: string;
  limit?: number;
  offset?: number;
}): Promise<Reservation[]> {
  let sql = 'SELECT * FROM rentals.reservations WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.customer_id) {
    sql += ` AND customer_id = $${paramIndex++}`;
    params.push(filters.customer_id);
  }

  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters?.rental_start_date_from) {
    sql += ` AND rental_start_date >= $${paramIndex++}`;
    params.push(filters.rental_start_date_from);
  }

  if (filters?.rental_start_date_to) {
    sql += ` AND rental_start_date <= $${paramIndex++}`;
    params.push(filters.rental_start_date_to);
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

  const result = await query<Reservation>(sql, params);
  return result.rows;
}

export async function getReservationItems(
  reservationId: string
): Promise<ReservationItem[]> {
  const result = await query<ReservationItem>(
    `
      SELECT * FROM rentals.reservation_items
      WHERE reservation_id = $1
      ORDER BY reservation_item_id
    `,
    [reservationId]
  );

  return result.rows;
}

export async function createReservation(
  input: CreateReservationInput,
  createdBy: string
): Promise<Reservation> {
  return await withTransaction(async (client) => {
    // Generate reservation number
    const reservationNumber = await generateReservationNumber();

    // Calculate rental period in days
    const startDate = new Date(input.rental_start_date);
    const endDate = new Date(input.rental_end_date);
    const rentalPeriodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate total equipment value and security deposit
    let totalEquipmentValue = 0;
    let totalSecurityDeposit = 0;

    for (const item of input.items) {
      const equipment = await client.query(
        'SELECT rental_rate_daily, security_deposit, replacement_value FROM rentals.equipment WHERE equipment_id = $1',
        [item.equipment_id]
      );

      if (equipment.rows.length === 0) {
        throw new Error(`Equipment ${item.equipment_id} not found`);
      }

      const eq = equipment.rows[0];
      const dailyRate = eq.rental_rate_daily || 0;
      const lineTotal = dailyRate * rentalPeriodDays * item.quantity;
      totalEquipmentValue += eq.replacement_value || 0;
      totalSecurityDeposit += (eq.security_deposit || 0) * item.quantity;
    }

    // Create reservation
    const reservationResult = await client.query<Reservation>(
      `
        INSERT INTO rentals.reservations (
          reservation_number, customer_id, event_name, event_type,
          event_date_start, event_date_end, rental_start_date, rental_end_date,
          pickup_location_id, delivery_address, delivery_required, delivery_cost,
          setup_required, setup_cost, status, total_equipment_value,
          security_deposit_amount, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15, $16, $17)
        RETURNING *
      `,
      [
        reservationNumber,
        input.customer_id,
        input.event_name || null,
        input.event_type || null,
        input.event_date_start || null,
        input.event_date_end || null,
        input.rental_start_date,
        input.rental_end_date,
        input.pickup_location_id || null,
        input.delivery_address || null,
        input.delivery_required || false,
        0, // delivery_cost calculated separately
        input.setup_required || false,
        0, // setup_cost calculated separately
        totalEquipmentValue,
        totalSecurityDeposit,
        createdBy,
      ]
    );

    const reservation = reservationResult.rows[0];

    // Create reservation items
    for (const item of input.items) {
      const equipment = await client.query(
        'SELECT rental_rate_daily FROM rentals.equipment WHERE equipment_id = $1',
        [item.equipment_id]
      );

      if (equipment.rows.length === 0) {
        throw new Error(`Equipment ${item.equipment_id} not found`);
      }

      const dailyRate = equipment.rows[0].rental_rate_daily || 0;
      const lineTotal = dailyRate * rentalPeriodDays * item.quantity;

      await client.query(
        `
          INSERT INTO rentals.reservation_items (
            reservation_id, equipment_id, quantity, rental_rate,
            rental_period_days, line_total
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          reservation.reservation_id,
          item.equipment_id,
          item.quantity,
          dailyRate,
          rentalPeriodDays,
          lineTotal,
        ]
      );
    }

    return reservation;
  });
}

export async function updateReservation(
  reservationId: string,
  updates: Partial<{
    status: ReservationStatus;
    pickup_date: string;
    return_date: string;
    notes: string;
  }>
): Promise<Reservation> {
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
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    return reservation;
  }

  updateFields.push(`updated_at = NOW()`);
  params.push(reservationId);

  const sql = `
    UPDATE rentals.reservations
    SET ${updateFields.join(', ')}
    WHERE reservation_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<Reservation>(sql, params);

  if (result.rows.length === 0) {
    throw new Error('Reservation not found');
  }

  return result.rows[0];
}

export async function cancelReservation(reservationId: string): Promise<Reservation> {
  return updateReservation(reservationId, {
    status: 'cancelled',
  });
}

