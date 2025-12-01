import { NextResponse } from 'next/server';
import { getSchemaMode } from '@/lib/cmm/db';
import { TagAIService } from '@/lib/cmm/tag-ai-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, applyChanges = false, webResearchEnabled = true } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Product ID is required',
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
    const result = await tagAIService.enrichProduct(productId, {
      applyChanges,
      webResearchEnabled,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || 'Failed to enrich product',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      provider: result.provider,
      model: result.model,
      confidence: result.data?.confidence,
    });
  } catch (error) {
    console.error('Product enrichment error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to enrich product',
      },
      { status: 500 }
    );
  }
}
