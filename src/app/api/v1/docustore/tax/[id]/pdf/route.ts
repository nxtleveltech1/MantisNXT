import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { TaxPDFService } from '@/lib/services/tax/tax-pdf-service';
import { getOrgId, getUserId } from '../../../../sales/_helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);
    const userId = await getUserId(request);

    const result = await TaxPDFService.generateTaxReturnPDF(id, orgId, userId);

    return NextResponse.json({
      success: true,
      data: {
        document_id: result.documentId,
        artifact_id: result.artifactId,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating tax PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate tax PDF',
      },
      { status: 500 }
    );
  }
}

