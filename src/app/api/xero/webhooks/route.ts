/**
 * Xero Webhooks Endpoint
 * 
 * POST /api/xero/webhooks
 * 
 * Receives webhook events from Xero with signature validation.
 * Responds quickly and queues events for async processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  validateWebhookSignature, 
  processWebhookEvent,
  storeWebhookEvent,
  type XeroWebhookPayload 
} from '@/lib/xero/webhooks';

/**
 * Xero sends a validation request on webhook setup
 * We must respond with exactly the same response for signature verification
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw payload
    const payload = await request.text();
    const signature = request.headers.get('x-xero-signature');

    // Validate signature
    if (!signature || !validateWebhookSignature(payload, signature)) {
      console.warn('[Xero Webhook] Invalid signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // Parse the payload
    const webhookPayload: XeroWebhookPayload = JSON.parse(payload);

    // Check if this is an intent-to-receive validation (empty events array)
    if (!webhookPayload.events || webhookPayload.events.length === 0) {
      // This is Xero checking we can receive webhooks
      // We must respond with 200 OK immediately
      console.log('[Xero Webhook] Intent-to-receive validation successful');
      return new NextResponse('OK', { status: 200 });
    }

    // Process events asynchronously
    // Store events for processing and respond immediately
    // Xero requires response within 5 seconds
    const processPromises = webhookPayload.events.map(async (event) => {
      try {
        await storeWebhookEvent(event);
        // Fire-and-forget processing (or use a queue in production)
        processWebhookEvent(event).catch(err => {
          console.error('[Xero Webhook] Async processing error:', err);
        });
      } catch (err) {
        console.error('[Xero Webhook] Event storage error:', err);
      }
    });

    // Wait for storage (fast operation), but not for processing
    await Promise.all(processPromises);

    console.log(`[Xero Webhook] Received ${webhookPayload.events.length} events`);

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('[Xero Webhook] Error:', error);
    
    // Still return 200 to prevent Xero from retrying
    // Log the error for investigation
    return new NextResponse('OK', { status: 200 });
  }
}

/**
 * GET method for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Xero Webhooks',
    message: 'This endpoint receives POST requests from Xero webhooks.',
  });
}
