import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CourierProviderService } from '@/lib/services/logistics';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

const updateCourierProviderSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  api_endpoint: z.string().url().optional().nullable(),
  api_credentials: z.record(z.unknown()).optional(),
  is_default: z.boolean().optional(),
  supports_tracking: z.boolean().optional(),
  supports_quotes: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = await getOrgId(request);
    const provider = await CourierProviderService.getCourierProviderById(params.id, orgId);

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Courier provider not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    console.error('Error fetching courier provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch courier provider',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validatedData = updateCourierProviderSchema.parse(body);

    const provider = await CourierProviderService.updateCourierProvider(params.id, orgId, validatedData);

    return NextResponse.json({
      success: true,
      data: provider,
      message: 'Courier provider updated successfully',
    });
  } catch (error) {
    console.error('Error updating courier provider:', error);
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update courier provider',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = await getOrgId(request);
    await CourierProviderService.deleteCourierProvider(params.id, orgId);

    return NextResponse.json({
      success: true,
      message: 'Courier provider deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting courier provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete courier provider',
      },
      { status: 500 }
    );
  }
}

