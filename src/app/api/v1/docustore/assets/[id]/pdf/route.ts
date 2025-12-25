import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AssetsPDFService } from '@/lib/services/assets/assets-pdf-service';
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
    const reportType = body.type || 'register';

    let result;
    if (reportType === 'depreciation') {
      result = await AssetsPDFService.generateDepreciationSchedulePDF(id, orgId, userId);
    } else if (reportType === 'disposal') {
      result = await AssetsPDFService.generateAssetDisposalReportPDF(id, orgId, userId);
    } else {
      result = await AssetsPDFService.generateAssetRegisterPDF(orgId, userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        document_id: result.documentId,
        artifact_id: result.artifactId,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating assets PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate assets PDF',
      },
      { status: 500 }
    );
  }
}

