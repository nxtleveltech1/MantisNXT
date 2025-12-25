// UPDATE: [2025-12-25] Enhanced rental agreement service with PDF generation and DocuStore integration
/**
 * Rental Agreement Service
 * Handles rental agreement/contract generation with PDF and DocuStore integration
 */

import type { PoolClient } from 'pg';
import { DocumentGenerator, DOCUMENT_TYPES, formatDate } from '@/lib/services/docustore';
import { query } from '@/lib/database/unified-connection';

export interface RentalAgreement {
  agreement_id: string;
  reservation_id: string;
  agreement_number: string;
  agreement_type: string;
  terms_and_conditions?: string;
  liability_waiver?: string;
  agreement_pdf_url?: string;
  document_id?: string;
  created_at: string;
}

export interface ReservationForAgreement {
  reservation_id: string;
  reservation_number: string;
  org_id: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_company?: string;
  pickup_date: string;
  return_date: string;
  equipment_items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    daily_rate: number;
  }>;
  subtotal: number;
  deposit_amount: number;
  total: number;
  notes?: string;
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

/**
 * Get reservation details for agreement generation
 */
export async function getReservationForAgreement(
  reservationId: string
): Promise<ReservationForAgreement | null> {
  const result = await query<ReservationForAgreement>(
    `
      SELECT 
        r.reservation_id,
        r.reservation_number,
        r.org_id,
        r.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.company as customer_company,
        r.pickup_date,
        r.return_date,
        r.subtotal,
        r.deposit_amount,
        r.total,
        r.notes,
        COALESCE(
          json_agg(
            json_build_object(
              'name', ei.name,
              'sku', ei.sku,
              'quantity', ri.quantity,
              'daily_rate', ri.daily_rate
            )
          ) FILTER (WHERE ri.item_id IS NOT NULL),
          '[]'::json
        ) as equipment_items
      FROM rentals.reservations r
      LEFT JOIN customer c ON c.id = r.customer_id
      LEFT JOIN rentals.reservation_items ri ON ri.reservation_id = r.reservation_id
      LEFT JOIN rentals.equipment_items ei ON ei.item_id = ri.item_id
      WHERE r.reservation_id = $1
      GROUP BY r.reservation_id, c.id
    `,
    [reservationId]
  );

  return result.rows[0] || null;
}

/**
 * Get or generate rental agreement - creates on demand if doesn't exist
 */
export async function getOrGenerateAgreement(
  reservationId: string,
  userId?: string
): Promise<RentalAgreement | null> {
  // Try to get existing agreement
  let agreement = await getAgreementByReservation(reservationId);
  
  if (agreement) {
    return agreement;
  }
  
  // Get reservation details to generate agreement
  const reservation = await getReservationForAgreement(reservationId);
  
  if (!reservation) {
    return null;
  }
  
  // Generate agreement using standalone query (not pool client)
  agreement = await generateAgreementStandalone(reservationId, reservation.reservation_number);
  
  // Generate PDF and store in DocuStore
  if (agreement) {
    try {
      const docResult = await generateAgreementPDF(agreement, reservation, userId);
      
      // Update agreement with document_id
      await query(
        `UPDATE rentals.rental_agreements SET document_id = $1 WHERE agreement_id = $2`,
        [docResult.documentId, agreement.agreement_id]
      );
      
      agreement.document_id = docResult.documentId;
    } catch (error) {
      console.error('Failed to generate agreement PDF:', error);
      // Agreement exists but PDF failed - still return agreement
    }
  }
  
  return agreement;
}

/**
 * Generate agreement without requiring PoolClient
 */
async function generateAgreementStandalone(
  reservationId: string,
  reservationNumber: string
): Promise<RentalAgreement> {
  const agreementNumber = `AGR-${reservationNumber}`;
  
  const termsAndConditions = getStandardTermsAndConditions();
  const liabilityWaiver = getStandardLiabilityWaiver();
  
  const result = await query<RentalAgreement>(
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
 * Generate agreement PDF and store in DocuStore
 */
export async function generateAgreementPDF(
  agreement: RentalAgreement,
  reservation: ReservationForAgreement,
  userId?: string
): Promise<{ documentId: string; artifactId: string }> {
  const htmlContent = generateAgreementHTML(agreement, reservation);
  
  const result = await DocumentGenerator.generate({
    orgId: reservation.org_id,
    documentType: DOCUMENT_TYPES.RENTAL_AGREEMENT,
    title: `Rental Agreement ${agreement.agreement_number}`,
    description: `Rental agreement for reservation ${reservation.reservation_number}`,
    documentNumber: agreement.agreement_number,
    htmlContent,
    tags: ['rental', 'agreement', 'contract'],
    metadata: {
      reservation_id: reservation.reservation_id,
      reservation_number: reservation.reservation_number,
      customer_id: reservation.customer_id,
      customer_name: reservation.customer_name,
      pickup_date: reservation.pickup_date,
      return_date: reservation.return_date,
      total: reservation.total,
    },
    entityLinks: [
      { entityType: 'reservation', entityId: reservation.reservation_id, linkType: 'primary' },
      { entityType: 'customer', entityId: reservation.customer_id, linkType: 'related' },
    ],
    generatedBy: userId,
    companyInfo: {
      name: 'NXT Level Tech',
    },
  });
  
  return {
    documentId: result.documentId,
    artifactId: result.artifactId,
  };
}

/**
 * Generate HTML content for rental agreement
 */
function generateAgreementHTML(
  agreement: RentalAgreement,
  reservation: ReservationForAgreement
): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  
  return `
    <div class="address-section">
      <div class="address-block">
        <div class="address-label">Renter Information</div>
        <div class="address-content">
          <div class="address-name">${reservation.customer_company || reservation.customer_name}</div>
          ${reservation.customer_company && reservation.customer_name !== reservation.customer_company 
            ? `<div>Attn: ${reservation.customer_name}</div>` 
            : ''}
          ${reservation.customer_email ? `<div>${reservation.customer_email}</div>` : ''}
          ${reservation.customer_phone ? `<div>${reservation.customer_phone}</div>` : ''}
        </div>
      </div>
      <div class="address-block">
        <div class="address-label">Rental Period</div>
        <div class="address-content">
          <div><strong>Pickup:</strong> ${formatDate(reservation.pickup_date)}</div>
          <div><strong>Return:</strong> ${formatDate(reservation.return_date)}</div>
          <div class="mt-4"><strong>Reservation:</strong> ${reservation.reservation_number}</div>
        </div>
      </div>
    </div>
    
    <h2>Equipment Rented</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 50%;">Item</th>
          <th class="center" style="width: 15%;">Qty</th>
          <th class="right" style="width: 17%;">Daily Rate</th>
          <th class="right" style="width: 18%;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${reservation.equipment_items.map(item => {
          const days = Math.ceil((new Date(reservation.return_date).getTime() - new Date(reservation.pickup_date).getTime()) / (1000 * 60 * 60 * 24)) || 1;
          const itemTotal = item.quantity * item.daily_rate * days;
          return `
            <tr>
              <td>
                <div class="item-name">${item.name}</div>
                ${item.sku ? `<div class="item-sku">SKU: ${item.sku}</div>` : ''}
              </td>
              <td class="center">${item.quantity}</td>
              <td class="right">${formatCurrency(item.daily_rate)}</td>
              <td class="right">${formatCurrency(itemTotal)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="label">Subtotal:</td>
          <td class="value">${formatCurrency(reservation.subtotal)}</td>
        </tr>
        <tr>
          <td class="label">Security Deposit:</td>
          <td class="value">${formatCurrency(reservation.deposit_amount)}</td>
        </tr>
        <tr class="total-row">
          <td class="label">TOTAL:</td>
          <td class="value">${formatCurrency(reservation.total)}</td>
        </tr>
      </table>
    </div>
    
    <div class="page-break"></div>
    
    <h2>Terms and Conditions</h2>
    <div class="notes-content" style="white-space: pre-line; font-size: 9pt; line-height: 1.6;">
${agreement.terms_and_conditions || 'Standard terms and conditions apply.'}
    </div>
    
    <h2 class="mt-8">Liability Waiver</h2>
    <div class="notes-content" style="white-space: pre-line; font-size: 9pt; line-height: 1.6;">
${agreement.liability_waiver || 'Standard liability waiver applies.'}
    </div>
    
    <div class="signature-section">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Renter Signature & Date</div>
        <div class="text-small text-muted mt-4">${reservation.customer_name}</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Company Representative & Date</div>
      </div>
    </div>
    
    ${reservation.notes ? `
    <div class="notes-section mt-8">
      <div class="notes-label">Additional Notes</div>
      <div class="notes-content">${reservation.notes}</div>
    </div>
    ` : ''}
  `;
}

/**
 * Get standard terms and conditions text
 */
function getStandardTermsAndConditions(): string {
  return `
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
}

/**
 * Get standard liability waiver text
 */
function getStandardLiabilityWaiver(): string {
  return `
LIABILITY WAIVER AND RELEASE

The Renter acknowledges that:
- AV equipment rental involves inherent risks
- Equipment may malfunction despite proper maintenance
- The Rental Company is not responsible for any loss of data, business interruption, or consequential damages
- Renter assumes all risks associated with equipment use
- Renter will indemnify and hold harmless the Rental Company from any claims arising from equipment use

By signing below, the Renter releases the Rental Company from any liability except for gross negligence or willful misconduct.
  `.trim();
}

