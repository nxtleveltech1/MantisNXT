// UPDATE: [2025-01-27] Rental agreement service for automatic contract generation with terms and conditions
/**
 * Rental Agreement Service
 * Handles rental agreement/contract generation
 */

import type { PoolClient } from 'pg';

export interface RentalAgreement {
  agreement_id: string;
  reservation_id: string;
  agreement_number: string;
  agreement_type: string;
  terms_and_conditions?: string;
  liability_waiver?: string;
  agreement_pdf_url?: string;
  created_at: string;
}

/**
 * Generate a rental agreement for a reservation
 */
export async function generateRentalAgreement(
  client: PoolClient,
  reservationId: string,
  reservationNumber: string
): Promise<RentalAgreement> {
  // Generate agreement number
  const agreementNumber = `AGR-${reservationNumber}`;

  // Standard terms and conditions for AV equipment rental
  const termsAndConditions = `
AV EQUIPMENT RENTAL AGREEMENT

This Rental Agreement ("Agreement") is entered into between the Renter and the Rental Company.

1. RENTAL PERIOD
   The rental period begins on the pickup date and ends on the return date as specified in the reservation.

2. EQUIPMENT CONDITION
   - Equipment must be returned in the same condition as received
   - Any damage, loss, or theft will result in charges to the Renter
   - Equipment will be inspected upon return

3. SECURITY DEPOSIT
   - A security deposit is required and will be held until equipment is returned and inspected
   - Deposit will be refunded within 7-14 business days after return if equipment is in good condition
   - Deposit may be used to cover damages, cleaning, or late return fees

4. LIABILITY
   - Renter is responsible for equipment from pickup until return
   - Renter must maintain insurance coverage as required
   - Rental Company is not liable for any indirect or consequential damages

5. PAYMENT TERMS
   - Full payment is due before equipment pickup
   - Late return fees apply: 50% of daily rate per day overdue
   - Additional charges may apply for damages, cleaning, or missing items

6. CANCELLATION
   - Cancellations more than 7 days before rental: Full refund minus 10% processing fee
   - Cancellations 3-7 days before rental: 50% refund
   - Cancellations less than 3 days before rental: No refund

7. PROHIBITED USES
   - Equipment may not be used for illegal purposes
   - Equipment may not be sublet or transferred without written consent
   - Equipment must be used in accordance with manufacturer specifications

8. RETURN CONDITIONS
   - Equipment must be returned clean and in working order
   - All accessories and cables must be included
   - Original packaging is not required but appreciated

By signing this agreement, the Renter acknowledges they have read, understood, and agree to all terms and conditions.
  `.trim();

  const liabilityWaiver = `
LIABILITY WAIVER AND RELEASE

The Renter acknowledges that:
- AV equipment rental involves inherent risks
- Equipment may malfunction despite proper maintenance
- The Rental Company is not responsible for any loss of data, business interruption, or consequential damages
- Renter assumes all risks associated with equipment use
- Renter will indemnify and hold harmless the Rental Company from any claims arising from equipment use

By signing below, the Renter releases the Rental Company from any liability except for gross negligence or willful misconduct.
  `.trim();

  // Insert agreement record
  const result = await client.query<RentalAgreement>(
    `
      INSERT INTO rentals.rental_agreements (
        reservation_id, agreement_number, agreement_type,
        terms_and_conditions, liability_waiver
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      reservationId,
      agreementNumber,
      'standard',
      termsAndConditions,
      liabilityWaiver,
    ]
  );

  return result.rows[0];
}

/**
 * Get rental agreement by reservation ID
 */
export async function getAgreementByReservation(
  reservationId: string
): Promise<RentalAgreement | null> {
  const { query } = await import('@/lib/database/unified-connection');
  const result = await query<RentalAgreement>(
    `
      SELECT * FROM rentals.rental_agreements
      WHERE reservation_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [reservationId]
  );

  return result.rows[0] || null;
}

