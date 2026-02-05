import { NextRequest, NextResponse } from 'next/server';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);

    const result = await query(
      `
      SELECT run_id, rule_id, org_id, project_id, trigger_type, trigger_context, status, message, created_at
      FROM core.pm_automation_run
      WHERE org_id = $1
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [orgId]
    );

    return NextResponse.json({ data: result.rows, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
