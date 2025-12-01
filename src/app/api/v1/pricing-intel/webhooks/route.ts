import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { WebhookDispatcher } from '@/lib/services/pricing-intel/WebhookDispatcher';
import { getOrgId } from '../_helpers';

const dispatcher = new WebhookDispatcher();

const registerSchema = z.object({
  orgId: z.string().uuid().optional(),
  event_type: z.string().min(3),
  target_url: z.string().url(),
  secret: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const hooks = await dispatcher.list(orgId);
    return NextResponse.json({ data: hooks, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to load webhooks' },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = registerSchema.parse(body);
    const orgId = await getOrgId(request, body);
    const hook = await dispatcher.register(orgId, payload);
    return NextResponse.json({ data: hook, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to register webhook' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const webhookId = new URL(request.url).searchParams.get('webhookId');
    if (!webhookId) {
      return NextResponse.json(
        { data: null, error: 'webhookId query parameter is required' },
        { status: 400 }
      );
    }
    await dispatcher.disable(orgId, webhookId);
    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to delete webhook' },
      { status: 400 }
    );
  }
}
