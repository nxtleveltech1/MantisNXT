import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SigningWorkflowService } from '@/lib/services/docustore';
import { getOrgId } from '../../../../sales/_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const workflowId = params.id;

    const status = await SigningWorkflowService.getWorkflowStatus(workflowId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    console.error('Error getting workflow status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workflow status',
      },
      { status: 404 }
    );
  }
}

