import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/project-management/analytics-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    const data = await AnalyticsService.roadmap(orgId, projectId || null);
    return NextResponse.json({ data, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
