import { NextResponse } from 'next/server';
import { getSchemaMode } from '@/lib/cmm/db';
import { getTagHierarchy } from '@/lib/cmm/tag-service-core';

export async function GET() {
  try {
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
          message: 'Tag hierarchy only supported in core schema mode',
        },
        { status: 501 }
      );
    }

    const hierarchy = await getTagHierarchy();

    return NextResponse.json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    console.error('Tag hierarchy error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch tag hierarchy',
      },
      { status: 500 }
    );
  }
}
