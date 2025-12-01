import { NextResponse } from 'next/server';
import { getSchemaMode } from '@/lib/cmm/db';
import { applyRules as applyLegacyRules } from '@/lib/cmm/db-sql';
import { applyCoreTagRules, ensureCoreTagInfrastructure } from '@/lib/cmm/tag-service-core';

export async function POST() {
  try {
    const schemaMode = await getSchemaMode();

    if (schemaMode === 'none') {
      return NextResponse.json(
        {
          success: false,
          message: 'Tag rule service unavailable (no schema detected).',
        },
        { status: 503 }
      );
    }

    if (schemaMode === 'core') {
      await ensureCoreTagInfrastructure();
      await applyCoreTagRules();
      return NextResponse.json({
        success: true,
        message: 'Rules applied across supplier products.',
      });
    }

    await applyLegacyRules();

    return NextResponse.json({
      success: true,
      message: 'Rules applied successfully',
    });
  } catch (error) {
    console.error('Apply rules error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to apply rules',
      },
      { status: 500 }
    );
  }
}
