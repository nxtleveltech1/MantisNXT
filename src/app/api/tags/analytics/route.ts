import { NextResponse } from 'next/server';
import { getSchemaMode } from '@/lib/cmm/db';
import { getTagAnalytics } from '@/lib/cmm/tag-service-core';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
          message: 'Analytics only supported in core schema mode',
        },
        { status: 501 }
      );
    }

    const dateRange =
      startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;

    const analytics = await getTagAnalytics(tagId || undefined, dateRange);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Tag analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch tag analytics',
      },
      { status: 500 }
    );
  }
}
