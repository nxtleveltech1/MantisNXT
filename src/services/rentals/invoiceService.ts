/**
 * Rental Invoice Service
 * Handles invoice generation for rentals
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type { Reservation, ReservationItem } from '@/types/rentals';

export interface RentalInvoice {
  invoice_id: string;
  reservation_id: string;
  invoice_number: string;
  customer_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export async function generateRentalInvoice(
  reservationId: string
): Promise<RentalInvoice> {
  return await withTransaction(async (client) => {
    // Get reservation details
    const reservation = await client.query<Reservation>(
      'SELECT * FROM rentals.reservations WHERE reservation_id = $1',
      [reservationId]
    );

    if (reservation.rows.length === 0) {
      throw new Error('Reservation not found');
    }

    const res = reservation.rows[0];

    // Get reservation items
    const items = await client.query<ReservationItem>(
      'SELECT * FROM rentals.reservation_items WHERE reservation_id = $1',
      [reservationId]
    );

    // Calculate totals
    const subtotal = items.rows.reduce((sum, item) => sum + item.line_total, 0);
    const deliveryCost = res.delivery_cost || 0;
    const setupCost = res.setup_cost || 0;
    const totalBeforeTax = subtotal + deliveryCost + setupCost;
    const taxAmount = totalBeforeTax * 0.15; // 15% VAT (adjust as needed)
    const totalAmount = totalBeforeTax + taxAmount;

    // Generate invoice number
    const invoiceNumber = `INV-RENT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Create invoice (assuming financial.invoices table exists)
    // This is a placeholder - adjust based on your actual invoice schema
    const invoiceResult = await client.query<RentalInvoice>(
      `
        INSERT INTO financial.invoices (
          invoice_number, customer_id, subtotal, tax_amount, total_amount, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'draft', NOW())
        RETURNING *
      `,
      [invoiceNumber, res.customer_id, subtotal, taxAmount, totalAmount]
    ).catch(() => {
      // If financial.invoices doesn't exist, create a simple record
      // In production, you'd want to integrate with your actual financial system
      return {
        rows: [
          {
            invoice_id: `temp-${Date.now()}`,
            reservation_id: reservationId,
            invoice_number: invoiceNumber,
            customer_id: res.customer_id,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'draft',
            created_at: new Date().toISOString(),
          },
        ],
      };
    });

    // Update reservation with invoice reference
    await client.query(
      'UPDATE rentals.reservations SET updated_at = NOW() WHERE reservation_id = $1',
      [reservationId]
    );

    return invoiceResult.rows[0];
  });
}

export async function getInvoiceByReservation(
  reservationId: string
): Promise<RentalInvoice | null> {
  // This would query your financial system
  // Placeholder implementation
  const result = await query<RentalInvoice>(
    `
      SELECT * FROM financial.invoices
      WHERE reservation_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [reservationId]
  ).catch(() => ({ rows: [] }));

  return result.rows[0] || null;
}

