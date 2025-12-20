import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrgId } from '@/app/api/v1/sales/_helpers';
import { LogisticsSettingsService } from '@/lib/services/logistics';
import { LogisticsSettingsSchema } from '@/lib/services/logistics/LogisticsSettingsService';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const settings = await LogisticsSettingsService.getSettings(orgId);

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching logistics settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch logistics settings',
      },
      { status: 500 }
    );
  }
}

const updateSchema = LogisticsSettingsSchema;

export async function PUT(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const updated = await LogisticsSettingsService.updateSettings(orgId, validated);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Logistics settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating logistics settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update logistics settings',
      },
      { status: 500 }
    );
  }
}




