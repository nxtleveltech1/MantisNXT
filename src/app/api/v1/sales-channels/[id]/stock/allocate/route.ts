import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ChannelStockService } from '@/lib/services/sales-channels';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

const allocateStockSchema = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive(),
  allocation_type: z.enum(['reserved', 'virtual']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = allocateStockSchema.parse(body);

    const allocation = await ChannelStockService.allocateStock(
      params.id,
      validated.product_id,
      validated.location_id || null,
      validated.quantity,
      validated.allocation_type,
      orgId
    );

    return NextResponse.json(
      {
        success: true,
        data: allocation,
      },
      { status: 201 }
    );
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

    console.error('Error in POST /api/v1/sales-channels/[id]/stock/allocate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to allocate stock',
      },
      { status: 500 }
    );
  }
}

