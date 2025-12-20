import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ChannelProductService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

const createChannelProductSchema = z.object({
  product_id: z.string().uuid(),
  channel_product_id: z.string().optional(),
  channel_sku: z.string().optional(),
  is_active: z.boolean().optional(),
  sync_enabled: z.boolean().optional(),
  price_override: z.number().nonnegative().optional(),
  title_override: z.string().max(500).optional(),
  description_override: z.string().optional(),
  image_urls: z.array(z.string().url()).optional(),
  channel_category: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('is_active');
    const syncEnabled = searchParams.get('sync_enabled');

    const products = await ChannelProductService.getChannelProducts(
      params.id,
      orgId,
      {
        is_active: isActive ? isActive === 'true' : undefined,
        sync_enabled: syncEnabled ? syncEnabled === 'true' : undefined,
      }
    );

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales-channels/[id]/products:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch channel products',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    // Support both single product and bulk creation
    if (Array.isArray(body)) {
      const validated = z.array(createChannelProductSchema).parse(body);
      const products = await ChannelProductService.bulkCreateChannelProducts(
        params.id,
        orgId,
        validated
      );

      return NextResponse.json(
        {
          success: true,
          data: products,
          total: products.length,
        },
        { status: 201 }
      );
    } else {
      const validated = createChannelProductSchema.parse(body);
      const product = await ChannelProductService.createChannelProduct({
        ...validated,
        channel_id: params.id,
        org_id: orgId,
      });

      return NextResponse.json(
        {
          success: true,
          data: product,
        },
        { status: 201 }
      );
    }
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

    console.error('Error in POST /api/v1/sales-channels/[id]/products:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create channel product',
      },
      { status: 500 }
    );
  }
}

