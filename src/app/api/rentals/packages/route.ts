import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as packageService from '@/services/rentals/packageService';
import { z } from 'zod';

const createPackageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  package_type: z.string().max(50).optional(),
  rental_rate_daily: z.number().nonnegative().optional(),
  rental_rate_weekly: z.number().nonnegative().optional(),
  rental_rate_monthly: z.number().nonnegative().optional(),
  items: z.array(
    z.object({
      equipment_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      is_required: z.boolean().optional(),
    })
  ).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') !== 'false';

    const packages = await packageService.listPackages(activeOnly);

    // Fetch items for each package
    const packagesWithItems = await Promise.all(
      packages.map(async (pkg) => {
        const items = await packageService.getPackageItems(pkg.package_id);
        return { ...pkg, items };
      })
    );

    return NextResponse.json({ success: true, data: packagesWithItems });
  } catch (error) {
    console.error('Error in GET /api/rentals/packages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch packages',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createPackageSchema.parse(body);

    const packageData = await packageService.createPackage(validated);

    const items = await packageService.getPackageItems(packageData.package_id);

    return NextResponse.json(
      { success: true, data: { ...packageData, items } },
      { status: 201 }
    );
  } catch (error) {
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

    console.error('Error in POST /api/rentals/packages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create package',
      },
      { status: 500 }
    );
  }
}

