import { NextRequest, NextResponse } from 'next/server';
import { PortfolioService } from '@/lib/services/project-management/portfolio-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; projectId: string } }) {
  try {
    await requirePmAuth(request);
    await PortfolioService.removeProject(params.id, params.projectId);
    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
