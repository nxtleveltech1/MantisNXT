import { NextRequest, NextResponse } from 'next/server';
import { LabelService } from '@/lib/services/project-management/label-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; labelId: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    await LabelService.remove(orgId, params.labelId);
    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
