import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SigningWorkflowService } from '@/lib/services/docustore';
import { getOrgId } from '../../../../sales/_helpers';

const sendReminderSchema = z.object({
  signer_id: z.string().uuid(),
  message: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const body = await request.json();
    const validated = sendReminderSchema.parse(body);

    await SigningWorkflowService.sendReminder(validated.signer_id, validated.message);

    return NextResponse.json({
      success: true,
      message: 'Reminder sent',
    });
  } catch (error: unknown) {
    console.error('Error sending reminder:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reminder',
      },
      { status: 400 }
    );
  }
}

