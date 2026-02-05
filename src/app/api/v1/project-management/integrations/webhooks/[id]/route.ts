import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/services/project-management/webhook-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    await WebhookService.remove(orgId, params.id);
    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
