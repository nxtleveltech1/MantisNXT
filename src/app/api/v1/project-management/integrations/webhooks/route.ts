import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { WebhookService } from '@/lib/services/project-management/webhook-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const WebhookCreateSchema = z.object({
  name: z.string().min(1),
  targetUrl: z.string().url(),
  events: z.array(z.string()).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const hooks = await WebhookService.list(orgId);
    return NextResponse.json({ data: hooks, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = WebhookCreateSchema.parse(body);

    const hook = await WebhookService.create({
      orgId,
      name: payload.name,
      targetUrl: payload.targetUrl,
      events: payload.events,
    });

    return NextResponse.json({ data: hook, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
