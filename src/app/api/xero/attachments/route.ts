/**
 * Xero Attachments API
 *
 * POST /api/xero/attachments - Upload attachment to entity
 * GET /api/xero/attachments - Fetch attachments for entity
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  uploadAttachmentToXero,
  fetchAttachmentsFromXero,
  downloadAttachmentFromXero,
} from '@/lib/xero/sync/attachments';
import { validateXeroRequest, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType') as 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item' | 'purchase_order';
    const entityId = searchParams.get('entityId');
    const attachmentId = searchParams.get('attachmentId');
    const download = searchParams.get('download') === 'true';

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId query parameters are required' },
        { status: 400 }
      );
    }

    // If attachmentId and download=true, download the file
    if (attachmentId && download) {
      const result = await downloadAttachmentFromXero(orgId, entityType, entityId, attachmentId);
      if (result.success && result.data) {
        return new NextResponse(result.data, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${attachmentId}"`,
          },
        });
      }
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    // Otherwise fetch list of attachments
    const result = await fetchAttachmentsFromXero(orgId, entityType, entityId);
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Attachments');
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const formData = await request.formData();
    const entityType = formData.get('entityType') as 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item' | 'purchase_order';
    const entityId = formData.get('entityId') as string;
    const file = formData.get('file') as File | null;

    if (!entityType || !entityId || !file) {
      return NextResponse.json(
        { error: 'entityType, entityId, and file are required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadAttachmentToXero(orgId, entityType, entityId, {
      name: file.name,
      content: buffer,
      mimeType: file.type || 'application/octet-stream',
    });

    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Attachments');
  }
}
