import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ProjectsPDFService } from '@/lib/services/projects/projects-pdf-service';
import { getOrgId, getUserId } from '../../../../sales/_helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);
    const userId = await getUserId(request);
    const body = await request.json().catch(() => ({}));
    const reportType = body.type || 'project';

    let result;
    if (reportType === 'timesheet') {
      result = await ProjectsPDFService.generateTimesheetReportPDF(id, orgId, userId);
    } else if (reportType === 'milestone') {
      result = await ProjectsPDFService.generateMilestoneReportPDF(id, orgId, userId);
    } else {
      result = await ProjectsPDFService.generateProjectReportPDF(id, orgId, userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        document_id: result.documentId,
        artifact_id: result.artifactId,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating projects PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate projects PDF',
      },
      { status: 500 }
    );
  }
}

