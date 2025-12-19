import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CourierProviderService } from '@/lib/services/logistics';
import { getOrgId } from '../../sales/_helpers';

const createCourierProviderSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  api_endpoint: z.string().url().optional(),
  api_credentials: z.record(z.unknown()).optional(),
  is_default: z.boolean().default(false),
  supports_tracking: z.boolean().default(true),
  supports_quotes: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;

    const providers = await CourierProviderService.getCourierProviders(orgId, {
      status: status as any,
    });

    return NextResponse.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    console.error('Error fetching courier providers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch courier providers',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validatedData = createCourierProviderSchema.parse(body);

    const provider = await CourierProviderService.createCourierProvider({
      org_id: orgId,
      ...validatedData,
    });

    return NextResponse.json(
      {
        success: true,
        data: provider,
        message: 'Courier provider created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating courier provider:', error);
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
        error: error instanceof Error ? error.message : 'Failed to create courier provider',
      },
      { status: 500 }
    );
  }
}

