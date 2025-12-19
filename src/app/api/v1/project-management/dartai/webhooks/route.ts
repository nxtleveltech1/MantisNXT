import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { requireAuth } from '@/lib/auth/auth-helper';

const WebhookEventSchema = z.object({
  type: z.enum(['task.created', 'task.updated', 'task.deleted']),
  data: z.unknown(),
});

// Webhook signature verification would go here if Dart-AI provides webhook signing
// For now, we'll rely on the authenticated endpoint and org scoping

export async function POST(request: NextRequest) {
  try {
    // Webhooks from Dart-AI should include authentication
    // For now, we require standard auth, but in production you'd verify webhook signatures
    const user = await requireAuth(request);
    if (!user.orgId) {
      return NextResponse.json(
        { data: null, error: { code: 'ORG_REQUIRED', message: 'Organization context required' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const event = WebhookEventSchema.parse(body);

    // Process webhook event
    // In a production system, you'd:
    // 1. Verify webhook signature
    // 2. Queue the event for async processing
    // 3. Update caches/views
    // 4. Notify connected clients via WebSocket/SSE

    console.log(`[Dart-AI Webhook] ${event.type}`, {
      orgId: user.orgId,
      userId: user.id,
      data: event.data,
    });

    // For now, we just acknowledge receipt
    // In the future, this could trigger:
    // - Cache invalidation
    // - Real-time UI updates
    // - Notification sending
    // - Analytics tracking

    return NextResponse.json({
      data: { received: true, eventType: event.type },
      error: null,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook payload', details: error.errors } },
        { status: 400 }
      );
    }
    return createErrorResponse(error, 500);
  }
}

// GET endpoint for webhook registration/verification
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user.orgId) {
      return NextResponse.json(
        { data: null, error: { code: 'ORG_REQUIRED', message: 'Organization context required' } },
        { status: 400 }
      );
    }

    // Return webhook URL and configuration
    const webhookUrl = `${request.nextUrl.origin}/api/v1/project-management/dartai/webhooks`;
    const supportedEvents = ['task.created', 'task.updated', 'task.deleted'];

    return NextResponse.json({
      data: {
        webhookUrl,
        supportedEvents,
        orgId: user.orgId,
        // In production, you'd generate a webhook secret here
        // secret: await generateWebhookSecret(user.orgId),
      },
      error: null,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}





