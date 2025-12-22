/**
 * Checkout/Checkin Service
 * Handles equipment checkout and return processes
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type {
  EquipmentCheckout,
  EquipmentCheckin,
  CheckoutType,
  CheckinType,
} from '@/types/rentals';

export async function createCheckout(
  reservationId: string,
  checkoutType: CheckoutType,
  data: {
    scheduled_datetime?: string;
    actual_datetime?: string;
    checked_out_by?: string;
    verified_by?: string;
    equipment_condition_notes?: string;
    photos_before?: string[];
    delivery_driver?: string;
    delivery_vehicle?: string;
    delivery_tracking_number?: string;
  }
): Promise<EquipmentCheckout> {
  return await withTransaction(async (client) => {
    // Create checkout record
    const checkoutResult = await client.query<EquipmentCheckout>(
      `
        INSERT INTO rentals.equipment_checkout (
          reservation_id, checkout_type, scheduled_datetime, actual_datetime,
          checked_out_by, verified_by, equipment_condition_notes, photos_before,
          delivery_driver, delivery_vehicle, delivery_tracking_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        reservationId,
        checkoutType,
        data.scheduled_datetime || null,
        data.actual_datetime || new Date().toISOString(),
        data.checked_out_by || null,
        data.verified_by || null,
        data.equipment_condition_notes || null,
        data.photos_before || null,
        data.delivery_driver || null,
        data.delivery_vehicle || null,
        data.delivery_tracking_number || null,
      ]
    );

    const checkout = checkoutResult.rows[0];

    // Update reservation status
    await client.query(
      `
        UPDATE rentals.reservations
        SET status = CASE
          WHEN $1 = 'pickup' THEN 'picked_up'
          WHEN $1 = 'delivery' THEN 'picked_up'
          ELSE status
        END,
        pickup_date = COALESCE($2::date, pickup_date)
        WHERE reservation_id = $3
      `,
      [
        checkoutType,
        data.actual_datetime ? new Date(data.actual_datetime).toISOString().split('T')[0] : null,
        reservationId,
      ]
    );

    // Update equipment availability status
    const reservationItems = await client.query(
      'SELECT equipment_id FROM rentals.reservation_items WHERE reservation_id = $1',
      [reservationId]
    );

    for (const item of reservationItems.rows) {
      await client.query(
        'UPDATE rentals.equipment SET availability_status = $1 WHERE equipment_id = $2',
        ['rented', item.equipment_id]
      );
    }

    return checkout;
  });
}

export async function createCheckin(
  reservationId: string,
  checkinType: CheckinType,
  data: {
    scheduled_datetime?: string;
    actual_datetime?: string;
    checked_in_by?: string;
    verified_by?: string;
    equipment_condition_notes?: string;
    photos_after?: string[];
    damage_reported?: boolean;
    missing_items?: string[];
    cleaning_required?: boolean;
    maintenance_required?: boolean;
  }
): Promise<EquipmentCheckin> {
  return await withTransaction(async (client) => {
    // Create checkin record
    const checkinResult = await client.query<EquipmentCheckin>(
      `
        INSERT INTO rentals.equipment_checkin (
          reservation_id, checkin_type, scheduled_datetime, actual_datetime,
          checked_in_by, verified_by, equipment_condition_notes, photos_after,
          damage_reported, missing_items, cleaning_required, maintenance_required
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [
        reservationId,
        checkinType,
        data.scheduled_datetime || null,
        data.actual_datetime || new Date().toISOString(),
        data.checked_in_by || null,
        data.verified_by || null,
        data.equipment_condition_notes || null,
        data.photos_after || null,
        data.damage_reported || false,
        data.missing_items || null,
        data.cleaning_required || false,
        data.maintenance_required || false,
      ]
    );

    const checkin = checkinResult.rows[0];

    // Update reservation status
    await client.query(
      `
        UPDATE rentals.reservations
        SET status = 'returned',
            return_date = COALESCE($1::date, return_date)
        WHERE reservation_id = $2
      `,
      [
        data.actual_datetime ? new Date(data.actual_datetime).toISOString().split('T')[0] : null,
        reservationId,
      ]
    );

    // Update equipment availability status
    const reservationItems = await client.query(
      'SELECT equipment_id FROM rentals.reservation_items WHERE reservation_id = $1',
      [reservationId]
    );

    for (const item of reservationItems.rows) {
      // Determine availability based on maintenance requirements
      const availabilityStatus = data.maintenance_required ? 'maintenance' : 'available';

      await client.query(
        'UPDATE rentals.equipment SET availability_status = $1 WHERE equipment_id = $2',
        [availabilityStatus, item.equipment_id]
      );
    }

    return checkin;
  });
}

export async function getCheckoutByReservation(
  reservationId: string
): Promise<EquipmentCheckout | null> {
  const result = await query<EquipmentCheckout>(
    `
      SELECT * FROM rentals.equipment_checkout
      WHERE reservation_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [reservationId]
  );

  return result.rows[0] || null;
}

export async function getCheckinByReservation(
  reservationId: string
): Promise<EquipmentCheckin | null> {
  const result = await query<EquipmentCheckin>(
    `
      SELECT * FROM rentals.equipment_checkin
      WHERE reservation_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [reservationId]
  );

  return result.rows[0] || null;
}

