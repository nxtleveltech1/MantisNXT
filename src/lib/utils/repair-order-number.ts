/**
 * Generate unique repair order numbers
 */

import { query } from '@/lib/database/unified-connection';

export async function generateRepairOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RO-${year}-`;

  // Get the highest number for this year
  const result = await query<{ repair_order_number: string }>(
    `
      SELECT repair_order_number
      FROM repairs.repair_orders
      WHERE repair_order_number LIKE $1
      ORDER BY repair_order_number DESC
      LIMIT 1
    `,
    [`${prefix}%`]
  );

  let sequence = 1;

  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].repair_order_number;
    const lastSequence = parseInt(lastNumber.split('-').pop() || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(6, '0')}`;
}

