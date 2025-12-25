/**
 * Messaging Service
 * 
 * Unified service for sending SMS and WhatsApp messages via Twilio.
 * Handles agreement delivery, OTP, and general notifications.
 */

import { query } from '@/lib/database';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type MessageChannel = 'sms' | 'whatsapp';

export interface MessageOptions {
  to: string;          // Phone number (E.164 format: +27...)
  body: string;        // Message content
  channel: MessageChannel;
  mediaUrl?: string;   // Optional media URL (for WhatsApp)
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: MessageChannel;
}

export interface AgreementDeliveryOptions {
  reservationId: string;
  agreementId: string;
  customerPhone: string;
  customerName: string;
  channel: MessageChannel;
  signingUrl: string;
  reservationNumber: string;
}

export interface AgreementDelivery {
  id: string;
  agreement_id: string;
  reservation_id: string;
  channel: MessageChannel;
  phone_number: string;
  message_id?: string;
  signing_token: string;
  signing_url: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'viewed' | 'signed';
  sent_at?: string;
  viewed_at?: string;
  signed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MESSAGING SERVICE CLASS
// ============================================================================

export class MessagingService {
  private orgId: string;
  private accountSid: string | null = null;
  private authToken: string | null = null;
  private fromPhone: string | null = null;
  private whatsappFrom: string | null = null;
  private initialized = false;
  private appUrl: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  /**
   * Initialize the service by loading configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load Twilio credentials from environment or database settings
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || null;
    this.authToken = process.env.TWILIO_AUTH_TOKEN || null;
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER || null;
    this.whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || null;

    // Optionally load org-specific settings from database
    try {
      const result = await query<{ settings: Record<string, unknown> }>(
        `SELECT settings FROM public.organization WHERE id = $1`,
        [this.orgId]
      );
      
      if (result.rows[0]?.settings) {
        const settings = result.rows[0].settings as {
          twilio_account_sid?: string;
          twilio_auth_token?: string;
          twilio_phone_number?: string;
          twilio_whatsapp_number?: string;
        };
        
        // Org-specific settings override environment variables
        if (settings.twilio_account_sid) this.accountSid = settings.twilio_account_sid;
        if (settings.twilio_auth_token) this.authToken = settings.twilio_auth_token;
        if (settings.twilio_phone_number) this.fromPhone = settings.twilio_phone_number;
        if (settings.twilio_whatsapp_number) this.whatsappFrom = settings.twilio_whatsapp_number;
      }
    } catch (error) {
      console.warn('Failed to load org messaging settings:', error);
    }

    this.initialized = true;
  }

  /**
   * Check if messaging is configured
   */
  async isConfigured(): Promise<{ sms: boolean; whatsapp: boolean }> {
    await this.initialize();
    return {
      sms: Boolean(this.accountSid && this.authToken && this.fromPhone),
      whatsapp: Boolean(this.accountSid && this.authToken && this.whatsappFrom),
    };
  }

  /**
   * Send a message via SMS or WhatsApp
   */
  async sendMessage(options: MessageOptions): Promise<MessageResult> {
    await this.initialize();

    const { to, body, channel, mediaUrl } = options;

    // Validate configuration
    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        error: 'Twilio credentials not configured',
        channel,
      };
    }

    const fromNumber = channel === 'whatsapp' 
      ? `whatsapp:${this.whatsappFrom}` 
      : this.fromPhone;

    if (!fromNumber) {
      return {
        success: false,
        error: `${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} phone number not configured`,
        channel,
      };
    }

    try {
      // Format destination number for WhatsApp
      const toNumber = channel === 'whatsapp' ? `whatsapp:${to}` : to;

      // Build request body
      const requestBody = new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: body,
      });

      if (mediaUrl && channel === 'whatsapp') {
        requestBody.append('MediaUrl', mediaUrl);
      }

      // Send via Twilio REST API
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: requestBody.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send message',
          channel,
        };
      }

      return {
        success: true,
        messageId: data.sid,
        channel,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
        channel,
      };
    }
  }

  /**
   * Send rental agreement for signing via SMS or WhatsApp
   */
  async sendAgreementForSigning(options: AgreementDeliveryOptions): Promise<{
    success: boolean;
    delivery?: AgreementDelivery;
    error?: string;
  }> {
    const { 
      reservationId, 
      agreementId, 
      customerPhone, 
      customerName,
      channel,
      signingUrl,
      reservationNumber,
    } = options;

    // Create signing token
    const signingToken = generateSigningToken();
    const fullSigningUrl = `${this.appUrl}${signingUrl}?token=${signingToken}`;

    // Compose message
    const message = channel === 'whatsapp'
      ? this.composeWhatsAppAgreementMessage(customerName, reservationNumber, fullSigningUrl)
      : this.composeSmsAgreementMessage(customerName, reservationNumber, fullSigningUrl);

    // Send the message
    const result = await this.sendMessage({
      to: customerPhone,
      body: message,
      channel,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Record the delivery in database
    try {
      const deliveryResult = await query<AgreementDelivery>(
        `INSERT INTO rentals.agreement_deliveries (
          agreement_id, reservation_id, channel, phone_number,
          message_id, signing_token, signing_url, status, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', NOW())
        RETURNING *`,
        [
          agreementId,
          reservationId,
          channel,
          customerPhone,
          result.messageId,
          signingToken,
          fullSigningUrl,
        ]
      );

      return {
        success: true,
        delivery: deliveryResult.rows[0],
      };
    } catch (error) {
      console.error('Error recording agreement delivery:', error);
      // Message was sent but we failed to record it
      return {
        success: true,
        error: 'Message sent but failed to record delivery',
      };
    }
  }

  /**
   * Compose SMS message for agreement signing
   */
  private composeSmsAgreementMessage(
    customerName: string,
    reservationNumber: string,
    signingUrl: string
  ): string {
    return `Hi ${customerName.split(' ')[0]},

Your rental agreement for ${reservationNumber} is ready for signature.

Please review and sign here:
${signingUrl}

This link expires in 7 days.

- NXT Level Tech`;
  }

  /**
   * Compose WhatsApp message for agreement signing
   */
  private composeWhatsAppAgreementMessage(
    customerName: string,
    reservationNumber: string,
    signingUrl: string
  ): string {
    return `📋 *Rental Agreement Ready for Signature*

Hi ${customerName.split(' ')[0]},

Your rental agreement for reservation *${reservationNumber}* is ready for your review and signature.

📝 Please review and sign the agreement:
${signingUrl}

⏳ This link expires in 7 days.

_If you have any questions, please contact us._

*NXT Level Tech*`;
  }

  /**
   * Get delivery status for an agreement
   */
  async getAgreementDeliveries(agreementId: string): Promise<AgreementDelivery[]> {
    const result = await query<AgreementDelivery>(
      `SELECT * FROM rentals.agreement_deliveries 
       WHERE agreement_id = $1 
       ORDER BY created_at DESC`,
      [agreementId]
    );
    return result.rows;
  }

  /**
   * Verify signing token and get agreement details
   */
  async verifySigningToken(token: string): Promise<{
    valid: boolean;
    delivery?: AgreementDelivery;
    expired?: boolean;
  }> {
    const result = await query<AgreementDelivery>(
      `SELECT * FROM rentals.agreement_deliveries 
       WHERE signing_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return { valid: false };
    }

    const delivery = result.rows[0];

    // Check if token is expired (7 days)
    const sentAt = new Date(delivery.sent_at || delivery.created_at);
    const expiresAt = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (new Date() > expiresAt) {
      return { valid: false, expired: true };
    }

    // Update viewed status if not already viewed
    if (!delivery.viewed_at) {
      await query(
        `UPDATE rentals.agreement_deliveries 
         SET viewed_at = NOW(), status = 'viewed', updated_at = NOW()
         WHERE id = $1`,
        [delivery.id]
      );
    }

    return { valid: true, delivery };
  }

  /**
   * Mark agreement as signed via delivery token
   */
  async markAgreementSigned(
    token: string,
    signatureData: string,
    metadata: { ip_address?: string; user_agent?: string }
  ): Promise<boolean> {
    try {
      await query(
        `UPDATE rentals.agreement_deliveries 
         SET signed_at = NOW(), status = 'signed', updated_at = NOW()
         WHERE signing_token = $1`,
        [token]
      );

      // Get the delivery to update the agreement
      const result = await query<AgreementDelivery>(
        `SELECT * FROM rentals.agreement_deliveries WHERE signing_token = $1`,
        [token]
      );

      if (result.rows.length > 0) {
        const delivery = result.rows[0];
        
        // Update the rental agreement with signature
        await query(
          `UPDATE rentals.rental_agreements 
           SET customer_signature = $1,
               customer_signed_at = NOW(),
               customer_signed_ip = $2,
               customer_signed_user_agent = $3,
               updated_at = NOW()
           WHERE agreement_id = $4`,
          [
            signatureData,
            metadata.ip_address,
            metadata.user_agent,
            delivery.agreement_id,
          ]
        );
      }

      return true;
    } catch (error) {
      console.error('Error marking agreement signed:', error);
      return false;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a secure signing token
 */
function generateSigningToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let token = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

/**
 * Format phone number to E.164 format for South Africa
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Handle South African numbers
  if (digits.startsWith('0')) {
    digits = '27' + digits.slice(1);
  }
  
  // Add + if not present
  if (!digits.startsWith('+')) {
    digits = '+' + digits;
  }
  
  return digits;
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

const serviceCache = new Map<string, MessagingService>();

export function getMessagingService(orgId: string): MessagingService {
  if (!serviceCache.has(orgId)) {
    serviceCache.set(orgId, new MessagingService(orgId));
  }
  return serviceCache.get(orgId)!;
}

