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

    // Log request details for debugging
    console.log('[Xero Webhook] Received request', {
      payloadLength: payload.length,
      hasSignature: !!signature,
      signatureLength: signature?.length,
      payloadPreview: payload.substring(0, 200),
    });

    // Validate signature
    if (!signature) {
      console.warn('[Xero Webhook] Missing x-xero-signature header');
      return new NextResponse('Missing signature', { status: 401 });
    }

    const isValidSignature = validateWebhookSignature(payload, signature);
    if (!isValidSignature) {
      console.warn('[Xero Webhook] Invalid signature', {
        payloadLength: payload.length,
        signaturePreview: signature.substring(0, 20),
      });
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // Parse the payload
    let webhookPayload: XeroWebhookPayload;
    try {
      webhookPayload = JSON.parse(payload);
    } catch (parseError) {
      console.error('[Xero Webhook] Failed to parse payload:', parseError);
      return new NextResponse('Invalid JSON', { status: 400 });
    }

    // Check if this is an intent-to-receive validation (empty events array)
    if (!webhookPayload.events || webhookPayload.events.length === 0) {
      // This is Xero checking we can receive webhooks
      // We must respond with 200 OK immediately
      console.log('[Xero Webhook] Intent-to-receive validation successful', {
        firstEventSequence: webhookPayload.firstEventSequence,
        lastEventSequence: webhookPayload.lastEventSequence,
        entropy: webhookPayload.entropy,
      });
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
