import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { IntegrationsPDFService } from '@/lib/services/integrations/integrations-pdf-service';
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
    const reportType = body.type || 'sync';

    let result;
    if (reportType === 'log') {
      result = await IntegrationsPDFService.generateIntegrationLogPDF(id, orgId, userId);
    } else {
      result = await IntegrationsPDFService.generateSyncReportPDF(id, orgId, userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        document_id: result.documentId,
        artifact_id: result.artifactId,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating integrations PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate integrations PDF',
      },
      { status: 500 }
    );
  }
}

