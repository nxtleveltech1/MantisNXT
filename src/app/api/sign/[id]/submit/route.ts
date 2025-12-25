/**
 * API Route: Submit Agreement Signature
 * 
 * POST /api/sign/[id]/submit
 * 
 * Public endpoint to submit a signature for a rental agreement.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';

const SubmitSignatureSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  signature: z.string().min(1, 'Signature is required'),
  terms_accepted: z.boolean(),
  liability_accepted: z.boolean(),
});

interface AgreementDelivery {
  id: string;
  agreement_id: string;
  reservation_id: string;
  status: string;
  signed_at: string | null;
  sent_at: string;
  created_at: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;
    
    // Get client IP and user agent
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse and validate request body
    const body = await request.json();
    const validation = SubmitSignatureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Invalid request',
        },
        { status: 400 }
      );
    }

    const { token, signature, terms_accepted, liability_accepted } = validation.data;

    if (!terms_accepted || !liability_accepted) {
      return NextResponse.json(
        {
          success: false,
          error: 'You must accept both terms and liability waiver',
        },
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
        error: 'Agreement already signed',
      });
    }

    // Check expiration (7 days from sent_at)
    const sentAt = new Date(delivery.sent_at || delivery.created_at);
    const expiresAt = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (new Date() > expiresAt) {
      return NextResponse.json({
        success: false,
        error: 'Token expired',
      });
    }

    // Update delivery status
    await query(
      `UPDATE rentals.agreement_deliveries 
       SET signed_at = NOW(), status = 'signed', updated_at = NOW()
       WHERE id = $1`,
      [delivery.id]
    );

    // Update the rental agreement with signature
    await query(
      `UPDATE rentals.rental_agreements 
       SET customer_signature = $1,
           customer_signed_at = NOW(),
           customer_signed_ip = $2,
           customer_signed_user_agent = $3,
           signature_status = 'customer_signed',
           updated_at = NOW()
       WHERE agreement_id = $4`,
      [signature, ip, userAgent, delivery.agreement_id]
    );

    // Update reservation status if applicable
    await query(
      `UPDATE rentals.reservations 
       SET agreement_signed = true,
           agreement_signed_at = NOW(),
           updated_at = NOW()
       WHERE reservation_id = $1`,
      [reservationId]
    );

    // Log the signature event
    await logSignatureEvent(
      delivery.agreement_id,
      reservationId,
      ip,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Agreement signed successfully',
      data: {
        signed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in POST /api/sign/[id]/submit:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit signature',
      },
      { status: 500 }
    );
  }
}

async function logSignatureEvent(
  agreementId: string,
  reservationId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO core.audit_log (
        entity_type, entity_id, action, details
      ) VALUES ('rental_agreement', $1, 'customer_signed', $2)`,
      [
        agreementId,
        JSON.stringify({
          reservation_id: reservationId,
          ip_address: ipAddress,
          user_agent: userAgent,
          signed_at: new Date().toISOString(),
        }),
      ]
    );
  } catch (error) {
    // Log but don't fail
    console.error('Failed to log signature event:', error);
  }
}

