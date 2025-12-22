/**
 * Generate unique reservation numbers
 */

import { query } from '@/lib/database/unified-connection';

export async function generateReservationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RENT-${year}-`;

  // Get the highest number for this year
  const result = await query<{ reservation_number: string }>(
    `
      SELECT reservation_number
      FROM rentals.reservations
      WHERE reservation_number LIKE $1
      ORDER BY reservation_number DESC
      LIMIT 1
    `,
    [`${prefix}%`]
  );

  let sequence = 1;

  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].reservation_number;
    const lastSequence = parseInt(lastNumber.split('-').pop() || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(6, '0')}`;
}

