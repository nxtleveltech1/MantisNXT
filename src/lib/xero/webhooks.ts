/**
 * Xero Webhooks Handler
 * 
 * Handles incoming webhook events from Xero with signature validation.
 * See: https://developer.xero.com/documentation/webhooks/overview
 */

import crypto from 'crypto';
import { query } from '@/lib/database';
import { XeroWebhookError } from './errors';
import type { XeroWebhookEvent } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface XeroWebhookPayload {
  events: XeroWebhookEventPayload[];
  firstEventSequence: number;
  lastEventSequence: number;
  entropy: string;
}

export interface XeroWebhookEventPayload {
  resourceUrl: string;
  resourceId: string;
  eventDateUtc: string;
  eventType: string;
  eventCategory: string;
  tenantId: string;
  tenantType: string;
}

// ============================================================================
// SIGNATURE VALIDATION
// ============================================================================

/**
 * Validate Xero webhook signature using HMAC-SHA256
 * 
 * @param payload - Raw request body as string
 * @param signature - x-xero-signature header value
 * @returns true if signature is valid
 */
export function validateWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const webhookKey = process.env.XERO_WEBHOOK_KEY?.trim();
  
  if (!webhookKey) {
    console.error('[Xero Webhook] XERO_WEBHOOK_KEY not configured');
    return false;
  }

  if (!signature) {
    console.warn('[Xero Webhook] Missing x-xero-signature header');
    return false;
  }

  try {
    // Generate HMAC-SHA256 hash of payload
    const expectedHash = crypto
      .createHmac('sha256', webhookKey)
      .update(payload)
      .digest('base64');

    // Trim signature to handle any whitespace issues
    const receivedSignature = signature.trim();

    // Decode both base64 strings to binary buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedHash, 'base64');
    const actualBuffer = Buffer.from(receivedSignature, 'base64');

    // Verify buffer lengths match before comparison
    if (expectedBuffer.length !== actualBuffer.length) {
      console.warn('[Xero Webhook] Signature length mismatch - potential attack attempt', {
        expectedLength: expectedBuffer.length,
        actualLength: actualBuffer.length,
        payloadLength: payload.length,
      });
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);

    if (!isValid) {
      console.warn('[Xero Webhook] Invalid webhook signature - rejecting request');
    }

    return isValid;
  } catch (error) {
    console.error('[Xero Webhook] Signature validation error:', error);
    return false;
  }
}

// ============================================================================
// EVENT STORAGE
// ============================================================================

/**
 * Store webhook event for processing
 */
export async function storeWebhookEvent(
  event: XeroWebhookEventPayload
): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO xero_webhook_events (
      webhook_event_id, resource_id, resource_url, event_category,
      event_type, event_date_utc, tenant_id, payload, processing_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
    ON CONFLICT (webhook_event_id) DO NOTHING
    RETURNING id`,
    [
      `${event.tenantId}-${event.resourceId}-${event.eventDateUtc}`,
      event.resourceId,
      event.resourceUrl,
      event.eventCategory,
      event.eventType,
      event.eventDateUtc,
      event.tenantId,
      JSON.stringify(event),
    ]
  );

  return result.rows[0]?.id || '';
}

/**
 * Mark event as processed
 */
export async function markEventProcessed(
  eventId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await query(
    `UPDATE xero_webhook_events
     SET processing_status = $2,
         processed_at = NOW(),
         error_message = $3
     WHERE id = $1`,
    [eventId, success ? 'processed' : 'failed', errorMessage || null]
  );
}

/**
 * Get pending webhook events
 */
export async function getPendingWebhookEvents(
  limit: number = 100
): Promise<XeroWebhookEvent[]> {
  const result = await query<{
    id: string;
    webhook_event_id: string;
    resource_id: string;
    resource_url: string;
    event_category: string;
    event_type: string;
    event_date_utc: Date;
    tenant_id: string;
    payload: unknown;
    processing_status: string;
    retry_count: number;
    created_at: Date;
  }>(
    `SELECT * FROM xero_webhook_events
     WHERE processing_status = 'pending'
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    webhookEventId: row.webhook_event_id,
    resourceId: row.resource_id,
    resourceUrl: row.resource_url,
    eventCategory: row.event_category,
    eventType: row.event_type,
    eventDateUtc: row.event_date_utc,
    tenantId: row.tenant_id,
    payload: row.payload,
    processingStatus: row.processing_status as XeroWebhookEvent['processingStatus'],
    processedAt: null,
    errorMessage: null,
    retryCount: row.retry_count,
    createdAt: row.created_at,
  }));
}

// ============================================================================
// EVENT PROCESSING
// ============================================================================

/**
 * Process a single webhook event
 */
export async function processWebhookEvent(
  event: XeroWebhookEventPayload
): Promise<{ success: boolean; message?: string }> {
  try {
    // Store the event
    const eventId = await storeWebhookEvent(event);
    
    if (!eventId) {
      // Event already processed (duplicate)
      return { success: true, message: 'Duplicate event ignored' };
    }

    // Process based on event category
    switch (event.eventCategory) {
      case 'INVOICE':
        await handleInvoiceEvent(event);
        break;
      
      case 'CONTACT':
        await handleContactEvent(event);
        break;
      
      case 'PAYMENT':
        await handlePaymentEvent(event);
        break;

      case 'CREDIT_NOTE':
        await handleCreditNoteEvent(event);
        break;

      default:
        console.log(`[Xero Webhook] Unhandled event category: ${event.eventCategory}`);
    }

    await markEventProcessed(eventId, true);
    return { success: true };

  } catch (error) {
    console.error('[Xero Webhook] Event processing error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Handle invoice webhook event — real-time sync: fetch from Xero and upsert into NXT
 */
async function handleInvoiceEvent(event: XeroWebhookEventPayload): Promise<void> {
  console.log(`[Xero Webhook] Invoice event: ${event.eventType} for ${event.resourceId}`);

  const connection = await query<{ org_id: string }>(
    `SELECT org_id FROM xero_connections 
     WHERE xero_tenant_id = $1 AND is_active = true`,
    [event.tenantId]
  );

  if (connection.rows.length === 0) {
    console.log('[Xero Webhook] No active connection for tenant:', event.tenantId);
    return;
  }

  const orgId = connection.rows[0].org_id;

  try {
    const { getInvoiceFromXero } = await import('./sync/invoices');
    const { upsertInvoiceFromXero } = await import('./sync/xero-to-nxt');

    const result = await getInvoiceFromXero(orgId, event.resourceId);
    if (!result.success || !result.data) {
      console.log('[Xero Webhook] Could not fetch invoice from Xero:', result.error);
      return;
    }

    const upsertResult = await upsertInvoiceFromXero(orgId, result.data);
    if (upsertResult.success) {
      console.log('[Xero Webhook] Invoice synced to NXT:', upsertResult.nxtId);
    } else {
      console.warn('[Xero Webhook] Invoice upsert failed:', upsertResult.error);
    }
  } catch (err) {
    console.error('[Xero Webhook] handleInvoiceEvent error:', err);
    throw err;
  }
}

/**
 * Handle contact webhook event — real-time sync: fetch from Xero and upsert into NXT
 */
async function handleContactEvent(event: XeroWebhookEventPayload): Promise<void> {
  console.log(`[Xero Webhook] Contact event: ${event.eventType} for ${event.resourceId}`);

  const connection = await query<{ org_id: string }>(
    `SELECT org_id FROM xero_connections 
     WHERE xero_tenant_id = $1 AND is_active = true`,
    [event.tenantId]
  );

  if (connection.rows.length === 0) {
    console.log('[Xero Webhook] No active connection for tenant:', event.tenantId);
    return;
  }

  const orgId = connection.rows[0].org_id;

  try {
    const { getContactFromXero } = await import('./sync/contacts');
    const { upsertContactFromXero } = await import('./sync/xero-to-nxt');

    const result = await getContactFromXero(orgId, event.resourceId);
    if (!result.success || !result.data) {
      console.log('[Xero Webhook] Could not fetch contact from Xero:', result.error);
      return;
    }

    const upsertResult = await upsertContactFromXero(orgId, result.data);
    if (upsertResult.success) {
      console.log('[Xero Webhook] Contact synced to NXT:', upsertResult.nxtId);
    } else {
      console.warn('[Xero Webhook] Contact upsert failed:', upsertResult.error);
    }
  } catch (err) {
    console.error('[Xero Webhook] handleContactEvent error:', err);
    throw err;
  }
}

/**
 * Handle payment webhook event
 * 
 * This is particularly important for updating invoice payment status
 * when payments are recorded in Xero
 */
async function handlePaymentEvent(event: XeroWebhookEventPayload): Promise<void> {
  console.log(`[Xero Webhook] Payment event: ${event.eventType} for ${event.resourceId}`);

  const connection = await query<{ org_id: string }>(
    `SELECT org_id FROM xero_connections 
     WHERE xero_tenant_id = $1 AND is_active = true`,
    [event.tenantId]
  );

  if (connection.rows.length === 0) {
    console.log('[Xero Webhook] No active connection for tenant:', event.tenantId);
    return;
  }

  const orgId = connection.rows[0].org_id;

  try {
    const { applyPaymentFromXero } = await import('./sync/xero-to-nxt');
    const { fetchPaymentsFromXero } = await import('./sync/payments');
    const paymentsResult = await fetchPaymentsFromXero(orgId);
    const payment = paymentsResult.success && paymentsResult.data
      ? paymentsResult.data.find((p: { PaymentID?: string }) => p.PaymentID === event.resourceId)
      : null;
    if (payment) {
      await applyPaymentFromXero(orgId, payment);
    }
  } catch (err) {
    console.error('[Xero Webhook] handlePaymentEvent error:', err);
  }
}

/**
 * Handle credit note webhook event — real-time sync: fetch from Xero and upsert into NXT
 */
async function handleCreditNoteEvent(event: XeroWebhookEventPayload): Promise<void> {
  console.log(`[Xero Webhook] Credit note event: ${event.eventType} for ${event.resourceId}`);

  const connection = await query<{ org_id: string }>(
    `SELECT org_id FROM xero_connections 
     WHERE xero_tenant_id = $1 AND is_active = true`,
    [event.tenantId]
  );

  if (connection.rows.length === 0) {
    console.log('[Xero Webhook] No active connection for tenant:', event.tenantId);
    return;
  }

  const orgId = connection.rows[0].org_id;

  try {
    const { fetchCreditNotesFromXero } = await import('./sync/credit-notes');
    const { upsertCreditNoteFromXero } = await import('./sync/xero-to-nxt');

    const result = await fetchCreditNotesFromXero(orgId);
    if (!result.success || !result.data) {
      console.log('[Xero Webhook] Could not fetch credit notes from Xero:', result.error);
      return;
    }

    const creditNote = result.data.find(
      (cn: { CreditNoteID?: string }) => cn.CreditNoteID === event.resourceId
    );
    if (!creditNote) {
      console.log('[Xero Webhook] Credit note not found in Xero response:', event.resourceId);
      return;
    }

    const upsertResult = await upsertCreditNoteFromXero(orgId, creditNote);
    if (upsertResult.success) {
      console.log('[Xero Webhook] Credit note synced to NXT:', upsertResult.nxtId);
    } else {
      console.warn('[Xero Webhook] Credit note upsert failed:', upsertResult.error);
    }
  } catch (err) {
    console.error('[Xero Webhook] handleCreditNoteEvent error:', err);
    throw err;
  }
}

/**
 * Process all pending webhook events (for background job)
 */
export async function processAllPendingEvents(): Promise<{
  processed: number;
  failed: number;
}> {
  const events = await getPendingWebhookEvents();
  let processed = 0;
  let failed = 0;

  for (const event of events) {
    const result = await processWebhookEvent({
      resourceId: event.resourceId,
      resourceUrl: event.resourceUrl || '',
      eventDateUtc: event.eventDateUtc.toISOString(),
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      tenantId: event.tenantId,
      tenantType: 'ORGANISATION',
    });

    if (result.success) {
      processed++;
    } else {
      failed++;
    }
  }

  return { processed, failed };
}
