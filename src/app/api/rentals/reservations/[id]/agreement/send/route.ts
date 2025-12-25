/**
 * API Route: Send Rental Agreement via SMS/WhatsApp
 * 
 * POST /api/rentals/reservations/[id]/agreement/send
 * 
 * Sends the rental agreement to the customer for signing via SMS or WhatsApp.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth/auth-helper';
import { query } from '@/lib/database';
import { 
  getOrGenerateAgreement, 
  getReservationForAgreement,
} from '@/services/rentals/agreementService';
import { 
  getMessagingService, 
  formatPhoneNumber,
  type MessageChannel,
} from '@/lib/services/messaging';

// Request validation schema
const SendAgreementSchema = z.object({
  channel: z.enum(['sms', 'whatsapp']),
  phone: z.string().min(10, 'Phone number is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: reservationId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = SendAgreementSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'VALIDATION_ERROR', 
          message: validation.error.errors[0]?.message || 'Invalid request',
        },
        { status: 400 }
      );
    }

    const { channel, phone } = validation.data;

    // Get or generate the agreement
    const agreement = await getOrGenerateAgreement(reservationId, user.userId);
    if (!agreement) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Get reservation details
    const reservation = await getReservationForAgreement(reservationId);
    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation details not found' },
        { status: 404 }
      );
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone);

    // Get messaging service
    const messagingService = getMessagingService(reservation.org_id);

    // Check if messaging is configured
    const config = await messagingService.isConfigured();
    if (channel === 'sms' && !config.sms) {
      return NextResponse.json(
        { success: false, error: 'NOT_CONFIGURED', message: 'SMS is not configured. Please add Twilio credentials.' },
        { status: 400 }
      );
    }
    if (channel === 'whatsapp' && !config.whatsapp) {
      return NextResponse.json(
        { success: false, error: 'NOT_CONFIGURED', message: 'WhatsApp is not configured. Please add Twilio WhatsApp number.' },
        { status: 400 }
      );
    }

    // Send the agreement
    const result = await messagingService.sendAgreementForSigning({
      reservationId,
      agreementId: agreement.agreement_id,
      customerPhone: formattedPhone,
      customerName: reservation.customer_name,
      channel: channel as MessageChannel,
      signingUrl: `/sign/${reservationId}`,
      reservationNumber: reservation.reservation_number,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'SEND_FAILED', message: result.error || 'Failed to send agreement' },
        { status: 500 }
      );
    }

    // Log the action
    await logAgreementSent(
      reservationId,
      agreement.agreement_id,
      user.userId,
      channel,
      formattedPhone
    );

    return NextResponse.json({
      success: true,
      message: `Agreement sent via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to ${phone}`,
      data: {
        delivery_id: result.delivery?.id,
        channel,
        phone: formattedPhone,
        sent_at: result.delivery?.sent_at,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/rentals/reservations/[id]/agreement/send:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send agreement',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get delivery history for an agreement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: reservationId } = await params;

    // Get deliveries for this reservation
    const result = await query(
      `SELECT ad.*, ra.agreement_number
       FROM rentals.agreement_deliveries ad
       JOIN rentals.rental_agreements ra ON ra.agreement_id = ad.agreement_id
       WHERE ad.reservation_id = $1
       ORDER BY ad.created_at DESC`,
      [reservationId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error in GET /api/rentals/reservations/[id]/agreement/send:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch deliveries',
      },
      { status: 500 }
    );
  }
}

/**
 * Log agreement sent action
 */
async function logAgreementSent(
  reservationId: string,
  agreementId: string,
  userId: string,
  channel: string,
  phone: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO core.audit_log (
        entity_type, entity_id, action, user_id, details
      ) VALUES ('rental_agreement', $1, 'agreement_sent', $2, $3)`,
      [
        agreementId,
        userId,
        JSON.stringify({
          reservation_id: reservationId,
          channel,
          phone,
          sent_at: new Date().toISOString(),
        }),
      ]
    );
  } catch (error) {
    // Log but don't fail if audit logging fails
    console.error('Failed to log agreement sent:', error);
  }
}

