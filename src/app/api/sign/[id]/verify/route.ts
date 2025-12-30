/**
 * API Route: Verify Signing Token
 * 
 * GET /api/sign/[id]/verify?token=xxx
 * 
 * Public endpoint to verify a signing token and return agreement details.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

interface AgreementDelivery {
  id: string;
  agreement_id: string;
  reservation_id: string;
  status: string;
  sent_at: string;
  viewed_at: string | null;
  signed_at: string | null;
  created_at: string;
}

interface AgreementData {
  agreement_id: string;
  agreement_number: string;
  terms_and_conditions: string;
  liability_waiver: string;
  signature_status: string;
  customer_signed_at: string | null;
}

interface ReservationData {
  reservation_id: string;
  reservation_number: string;
  customer_name: string;
  pickup_date: string;
  return_date: string;
  subtotal: number;
  deposit_amount: number;
  total: number;
}

interface EquipmentItem {
  name: string;
  quantity: number;
  daily_rate: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the delivery by token
    const deliveryResult = await query<AgreementDelivery>(
      `SELECT * FROM rentals.agreement_deliveries 
       WHERE signing_token = $1 AND reservation_id = $2`,
      [token, reservationId]
    );

    if (deliveryResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token',
      });
    }

    const delivery = deliveryResult.rows[0];

    // Check if already signed
    if (delivery.signed_at) {
      return NextResponse.json({
        success: false,
        already_signed: true,
        error: 'Agreement already signed',
      });
    }

    // Check expiration (7 days from sent_at)
    const sentAt = new Date(delivery.sent_at || delivery.created_at);
    const expiresAt = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (new Date() > expiresAt) {
      // Mark as expired
      await query(
        `UPDATE rentals.agreement_deliveries 
         SET status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [delivery.id]
      );

      return NextResponse.json({
        success: false,
        expired: true,
        error: 'Token expired',
      });
    }

    // Update viewed status
    if (!delivery.viewed_at) {
      await query(
        `UPDATE rentals.agreement_deliveries 
         SET viewed_at = NOW(), status = 'viewed', updated_at = NOW()
         WHERE id = $1`,
        [delivery.id]
      );
    }

    // Get agreement details
    const agreementResult = await query<AgreementData>(
      `SELECT agreement_id, agreement_number, terms_and_conditions, 
              liability_waiver, signature_status, customer_signed_at
       FROM rentals.rental_agreements
       WHERE agreement_id = $1`,
      [delivery.agreement_id]
    );

    if (agreementResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Agreement not found',
      });
    }

    const agreement = agreementResult.rows[0];

    // Get reservation details
    const reservationResult = await query<ReservationData>(
      `SELECT 
         r.reservation_id,
         r.reservation_number,
         c.name as customer_name,
         r.pickup_date,
         r.return_date,
         r.subtotal,
         COALESCE(r.security_deposit_amount, 0) as deposit_amount,
         r.total_amount_due as total
       FROM rentals.reservations r
       LEFT JOIN customer c ON c.id = r.customer_id
       WHERE r.reservation_id = $1`,
      [reservationId]
    );

    if (reservationResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Reservation not found',
      });
    }

    const reservation = reservationResult.rows[0];

    // Get equipment items
    const itemsResult = await query<EquipmentItem>(
      `SELECT 
         ei.name,
         ri.quantity,
         ri.rental_rate as daily_rate
       FROM rentals.reservation_items ri
       LEFT JOIN rentals.equipment_items ei ON ei.item_id = ri.equipment_id
       WHERE ri.reservation_id = $1`,
      [reservationId]
    );

    return NextResponse.json({
      success: true,
      data: {
        agreement,
        reservation: {
          ...reservation,
          equipment_items: itemsResult.rows,
        },
        delivery: {
          id: delivery.id,
          status: delivery.status,
          viewed_at: delivery.viewed_at,
          signed_at: delivery.signed_at,
        },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/sign/[id]/verify:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify token',
      },
      { status: 500 }
    );
  }
}



