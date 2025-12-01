import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSchemaMode } from '@/lib/cmm/db';
import { TagAIService } from '@/lib/cmm/tag-ai-service';
import { authenticateRequest } from '@/lib/ai/api-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Extract orgId from auth context
    let orgId: string | undefined;
    try {
      const user = await authenticateRequest(request);
      orgId = user.org_id;
    } catch (authError) {
      console.warn('[tag-enrich] Auth failed, using fallback orgId:', authError);
      // Continue with undefined orgId - will use default fallback
    }

    const body = await request.json();
    const {
      productIds,
      applyChanges = false,
      webResearchEnabled = true,
      batchSize,
      batchDelayMs,
    } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Product IDs array is required',
        },
        { status: 400 }
      );
    }

    const schemaMode = await getSchemaMode();

    if (schemaMode === 'none') {
      return NextResponse.json(
        {
          success: false,
          message: 'Tag service unavailable (no schema detected).',
        },
        { status: 503 }
      );
    }

    if (schemaMode !== 'core') {
      return NextResponse.json(
        {
          success: false,
          message: 'Product enrichment only supported in core schema mode',
        },
        { status: 501 }
      );
    }

    const tagAIService = new TagAIService();
    const result = await tagAIService.enrichProductBatch(productIds, {
      orgId,
      applyChanges,
      webResearchEnabled,
      batchSize,
      batchDelayMs,
    });

    if (!result.success) {
      // Check for quota errors and provide user-friendly messages
      const errorMessage = result.error || 'Failed to enrich products';
      const isQuotaError =
        errorMessage.includes('quota') ||
        errorMessage.includes('insufficient_quota') ||
        errorMessage.includes('exceeded your current quota');

      const statusCode = isQuotaError ? 429 : 500;
      const userMessage = isQuotaError
        ? 'OpenAI API quota exceeded. Please check your billing and plan limits, or try again later.'
        : errorMessage;

      return NextResponse.json(
        {
          success: false,
          message: userMessage,
          error: errorMessage,
          code: isQuotaError ? 'QUOTA_EXCEEDED' : 'ENRICHMENT_FAILED',
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      data: Array.from(result.data?.entries() || []).map(([id, enrichment]) => ({
        supplier_product_id: id,
        ...enrichment,
      })),
      count: result.data?.size || 0,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('Batch product enrichment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to enrich products';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log full error details for debugging
    console.error('Full error details:', { errorMessage, errorStack, error });

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
