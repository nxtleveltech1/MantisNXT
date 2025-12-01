import { NextRequest, NextResponse } from 'next/server';

import { AIPriceExtractionService } from '@/lib/services/supplier/AIPriceExtractionService';

export const runtime = 'nodejs';
export const maxDuration = 60;

const extractor = new AIPriceExtractionService();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Expected multipart/form-data with file field "file"' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Missing upload in field "file"' },
        { status: 400 }
      );
    }

    const orgIdValue = req.headers.get('x-org-id') || formData.get('org_id') || process.env.ORG_ID;
    if (!orgIdValue || !uuidRegex.test(orgIdValue.toString())) {
      return NextResponse.json(
        {
          success: false,
          error: 'org_id must be a valid UUID (supply via header x-org-id or form field org_id).',
        },
        { status: 400 }
      );
    }
    const orgId = orgIdValue.toString();

    const serviceIdValue = req.headers.get('x-ai-service-id') || formData.get('service_id');
    const serviceId =
      serviceIdValue && uuidRegex.test(serviceIdValue.toString())
        ? serviceIdValue.toString()
        : undefined;
    const serviceName =
      (
        formData.get('service_name') ||
        req.headers.get('x-ai-service-name') ||
        process.env.AI_PRICE_EXTRACTION_SERVICE_NAME
      )?.toString() || 'Supplier Pricelist Data Extraction';

    const supplierId = formData.get('supplier_id')?.toString();
    const instructions = formData.get('instructions')?.toString();

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractor.extract({
      orgId,
      supplierId,
      serviceId,
      serviceName,
      fileName: file.name,
      fileBuffer: buffer,
      instructions,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[AI_PRICE_EXTRACTION_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
