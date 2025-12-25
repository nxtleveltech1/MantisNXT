import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AnalyticsPDFService } from '@/lib/services/analytics/analytics-pdf-service';
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
    const reportType = body.type || 'analytics';

    let result;
    if (reportType === 'dashboard') {
      result = await AnalyticsPDFService.generateDashboardReportPDF(id, orgId, userId);
    } else if (reportType === 'performance') {
      result = await AnalyticsPDFService.generatePerformanceReportPDF(id, orgId, userId);
    } else {
      result = await AnalyticsPDFService.generateAnalyticsReportPDF(id, orgId, userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        document_id: result.documentId,
        artifact_id: result.artifactId,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating analytics PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate analytics PDF',
      },
      { status: 500 }
    );
  }
}

