/**
 * /api/spp/uploads/[id] - Upload management endpoints
 *
 * GET: Get upload details with all rows
 * PATCH: Update upload status or metadata
 * DELETE: Soft delete upload (mark as rejected)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pricelistService } from '@/lib/services/PricelistService';
import { createErrorResponse, validateRequestBody } from '@/lib/utils/neon-error-handler';

/**
 * GET /api/spp/uploads/[id] - Get upload details with all rows
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const details = await pricelistService.getUploadDetails(id);

    if (!details) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upload not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('[API] Get upload details error:', error);
    return createErrorResponse(error, 500);
  }
}

/**
 * PATCH /api/spp/uploads/[id] - Update upload status or reprocess
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle reprocess action
    if (body.action === 'reprocess') {
      const result = await pricelistService.reprocessUpload(id);

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Upload reprocessed successfully'
      });
    }

    // Validate required fields for status update
    const validation = validateRequestBody(body, ['status']);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Update upload status
    await pricelistService['updateUploadStatus'](id, body.status, body.notes);

    const updated = await pricelistService.getUploadById(id);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Upload updated successfully'
    });
  } catch (error) {
    console.error('[API] Update upload error:', error);
    return createErrorResponse(error, 500);
  }
}

/**
 * DELETE /api/spp/uploads/[id] - Soft delete upload (mark as rejected)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete by marking as rejected
    await pricelistService['updateUploadStatus'](id, 'rejected', {
      deleted_at: new Date().toISOString(),
      deleted_by: 'system' // TODO: Get from auth session
    });

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully'
    });
  } catch (error) {
    console.error('[API] Delete upload error:', error);
    return createErrorResponse(error, 500);
  }
}
