import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SigningWorkflowService } from '@/lib/services/docustore';
import { getOrgId } from '../../../../sales/_helpers';

const createSigningWorkflowSchema = z.object({
  document_id: z.string().uuid(),
  expires_at: z.string().datetime().optional(),
  reminder_settings: z.record(z.unknown()).optional(),
});

const updateSigningWorkflowSchema = z.object({
  status: z.enum(['draft', 'pending', 'in_progress', 'completed', 'voided', 'expired']).optional(),
  expires_at: z.string().datetime().optional().nullable(),
  reminder_settings: z.record(z.unknown()).optional(),
  voided_reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request); // Verify org context
    const userId = request.headers.get('x-user-id') || request.headers.get('x-clerk-user-id') || undefined;
    const body = await request.json();
    const validated = createSigningWorkflowSchema.parse(body);

    const workflow = await SigningWorkflowService.createWorkflow({
      document_id: validated.document_id,
      expires_at: validated.expires_at,
      reminder_settings: validated.reminder_settings,
      created_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: workflow,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating signing workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create signing workflow',
      },
      { status: 400 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const userId = request.headers.get('x-user-id') || request.headers.get('x-clerk-user-id') || undefined;
    const body = await request.json();
    const validated = updateSigningWorkflowSchema.parse(body);

    const workflowId = params.id;

    // Get current workflow
    const status = await SigningWorkflowService.getWorkflowStatus(workflowId);

    // Update workflow based on validated input
    if (validated.status === 'voided') {
      await SigningWorkflowService.voidWorkflow(workflowId, validated.voided_reason);
    } else if (validated.expires_at !== undefined || validated.reminder_settings !== undefined) {
      // For other updates, we'd need an update method in the service
      // For now, return current workflow
      return NextResponse.json({
        success: true,
        data: status.workflow,
      });
    }

    const updatedStatus = await SigningWorkflowService.getWorkflowStatus(workflowId);

    return NextResponse.json({
      success: true,
      data: updatedStatus.workflow,
    });
  } catch (error: unknown) {
    console.error('Error updating signing workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update signing workflow',
      },
      { status: 400 }
    );
  }
}

