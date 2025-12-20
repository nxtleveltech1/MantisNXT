import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ChannelProductService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

const updateChannelProductSchema = z.object({
  channel_product_id: z.string().optional().nullable(),
  channel_sku: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  sync_enabled: z.boolean().optional(),
  price_override: z.number().nonnegative().optional().nullable(),
  title_override: z.string().max(500).optional().nullable(),
  description_override: z.string().optional().nullable(),
  image_urls: z.array(z.string().url()).optional().nullable(),
  channel_category: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const product = await ChannelProductService.getChannelProductByProductId(
      params.id,
      params.productId,
      orgId
    );

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel product not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales-channels/[id]/products/[productId]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch channel product',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = updateChannelProductSchema.parse(body);

    // Get the channel product ID first
    const existing = await ChannelProductService.getChannelProductByProductId(
      params.id,
      params.productId,
      orgId
    );

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel product not found',
        },
        { status: 404 }
      );
    }

    const product = await ChannelProductService.updateChannelProduct(
      existing.id,
      params.id,
      orgId,
      validated
    );

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error in PUT /api/v1/sales-channels/[id]/products/[productId]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update channel product',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const orgId = await getOrgId(request);

    const existing = await ChannelProductService.getChannelProductByProductId(
      params.id,
      params.productId,
      orgId
    );

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel product not found',
        },
        { status: 404 }
      );
    }

    await ChannelProductService.deleteChannelProduct(existing.id, params.id, orgId);

    return NextResponse.json({
      success: true,
      message: 'Channel product deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/v1/sales-channels/[id]/products/[productId]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete channel product',
      },
      { status: 500 }
    );
  }
}

