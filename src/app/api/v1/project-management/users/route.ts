import { NextRequest, NextResponse } from 'next/server';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const result = await query(
      `
      SELECT id, email, display_name, first_name, last_name, avatar_url, department, job_title
      FROM auth.users_extended
      WHERE org_id = $1 AND is_active = true
      ORDER BY display_name NULLS LAST, email ASC
      `,
      [orgId]
    );

    return NextResponse.json({ data: result.rows, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
