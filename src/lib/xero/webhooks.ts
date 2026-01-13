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
  const webhookKey = process.env.XERO_WEBHOOK_KEY;
  
  if (!webhookKey) {
    console.error('[Xero Webhook] XERO_WEBHOOK_KEY not configured');
    return false;
  }

  try {
    const hash = crypto
      .createHmac('sha256', webhookKey)
      .update(payload)
      .digest('base64');

    // Use timing-safe comparison to prevent timing attacks
    const expected = Buffer.from(hash);
    const actual = Buffer.from(signature);
    
    if (expected.length !== actual.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expected, actual);
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
 * Handle invoice webhook event
 * 
 * When an invoice is updated in Xero, update the corresponding
 * NXT invoice status (especially payment status)
 */
async function handleInvoiceEvent(event: XeroWebhookEventPayload): Promise<void> {
  console.log(`[Xero Webhook] Invoice event: ${event.eventType} for ${event.resourceId}`);
  
  // Find org that has this Xero tenant connected
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

  // Find the NXT entity mapped to this Xero invoice
  const mapping = await query<{ nxt_entity_id: string }>(
    `SELECT nxt_entity_id FROM xero_entity_mappings
     WHERE org_id = $1 AND xero_entity_id = $2 AND entity_type = 'invoice'`,
    [orgId, event.resourceId]
  );

  if (mapping.rows.length === 0) {
    // Invoice doesn't exist in our system - might be created directly in Xero
    // Could optionally sync it to NXT here
    console.log('[Xero Webhook] No NXT mapping found for invoice:', event.resourceId);
    return;
  }

  const nxtEntityId = mapping.rows[0].nxt_entity_id;

  // Mark the mapping as needing sync (to be picked up by a background job)
  await query(
    `UPDATE xero_entity_mappings 
     SET sync_status = 'pending', 
         xero_updated_date_utc = $3,
         updated_at = NOW()
     WHERE org_id = $1 AND xero_entity_id = $2 AND entity_type = 'invoice'`,
    [orgId, event.resourceId, event.eventDateUtc]
  );

  console.log(`[Xero Webhook] Invoice ${event.resourceId} marked for sync, NXT ID: ${nxtEntityId}`);
}

/**
 * Handle contact webhook event
 * 
 * When a contact is updated in Xero, mark the corresponding
 * NXT supplier/customer for sync
 */
async function handleContactEvent(event: XeroWebhookEventPayload): Promise<void> {
  console.log(`[Xero Webhook] Contact event: ${event.eventType} for ${event.resourceId}`);
  
  // Find org that has this Xero tenant connected
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

  // Find the NXT entity mapped to this Xero contact
  const mapping = await query<{ nxt_entity_id: string }>(
    `SELECT nxt_entity_id FROM xero_entity_mappings
     WHERE org_id = $1 AND xero_entity_id = $2 AND entity_type = 'contact'`,
    [orgId, event.resourceId]
  );

  if (mapping.rows.length === 0) {
    // Contact doesn't exist in our system - new contact from Xero
    console.log('[Xero Webhook] No NXT mapping found for contact:', event.resourceId);
    
    // Store for potential import later
    await query(
      `INSERT INTO xero_entity_mappings (
        org_id, entity_type, nxt_entity_id, xero_entity_id, 
        sync_status, xero_updated_date_utc
      ) VALUES ($1, 'contact', uuid_generate_v4(), $2, 'pending', $3)
      ON CONFLICT (org_id, entity_type, nxt_entity_id) DO NOTHING`,
      [orgId, event.resourceId, event.eventDateUtc]
    );
    return;
  }

  // Mark for sync
  await query(
    `UPDATE xero_entity_mappings 
     SET sync_status = 'pending', 
         xero_updated_date_utc = $3,
         updated_at = NOW()
     WHERE org_id = $1 AND xero_entity_id = $2 AND entity_type = 'contact'`,
    [orgId, event.resourceId, event.eventDateUtc]
  );

  console.log(`[Xero Webhook] Contact ${event.resourceId} marked for sync`);
}

/**
 * Handle payment webhook event
 * 
 * This is particularly important for updating invoice payment status
 * when payments are recorded in Xero
 */
async function handlePaymentEvent(event: XeroWebhookEventPayload): Promise<void> {
  console.log(`[Xero Webhook] Payment event: ${event.eventType} for ${event.resourceId}`);
  
  // Find org that has this Xero tenant connected
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

  // Check if we have this payment mapped
  const mapping = await query<{ nxt_entity_id: string }>(
    `SELECT nxt_entity_id FROM xero_entity_mappings
     WHERE org_id = $1 AND xero_entity_id = $2 AND entity_type = 'payment'`,
    [orgId, event.resourceId]
  );

  if (mapping.rows.length > 0) {
    // Payment exists in our system - mark for status sync
    await query(
      `UPDATE xero_entity_mappings 
       SET sync_status = 'pending', 
           xero_updated_date_utc = $3,
           updated_at = NOW()
       WHERE org_id = $1 AND xero_entity_id = $2 AND entity_type = 'payment'`,
      [orgId, event.resourceId, event.eventDateUtc]
    );
    console.log(`[Xero Webhook] Payment ${event.resourceId} marked for sync`);
  } else {
    // New payment from Xero - create pending mapping for import
    console.log(`[Xero Webhook] New payment from Xero: ${event.resourceId}`);
    
    // Store for potential import - this payment may update an invoice we know about
    await query(
      `INSERT INTO xero_entity_mappings (
        org_id, entity_type, nxt_entity_id, xero_entity_id, 
        sync_status, xero_updated_date_utc
      ) VALUES ($1, 'payment', uuid_generate_v4(), $2, 'pending', $3)
      ON CONFLICT (org_id, entity_type, nxt_entity_id) DO NOTHING`,
      [orgId, event.resourceId, event.eventDateUtc]
    );
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
