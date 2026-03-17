/**
 * List Organizations API
 *
 * GET /api/v1/organizations
 * Returns all organizations for the org switcher.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query<{ id: string; name: string; slug: string }>(
      `SELECT id, name, slug FROM organization WHERE is_active = true ORDER BY name ASC`
    );

    const organizations = (result.rows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
    }));

    return NextResponse.json({
      success: true,
      data: { organizations },
    });
  } catch (error) {
    console.error('Error listing organizations:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list organizations' },
      { status: 500 }
    );
  }
}
