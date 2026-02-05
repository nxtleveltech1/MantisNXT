import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { AutomationService } from '@/lib/services/project-management/automation-service';

export const runtime = 'nodejs';
export const maxDuration = 120;

function isAuthorized(request: NextRequest): boolean {
  return request.headers.get('x-vercel-cron') === '1';
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgResult = await query<{ id: string }>('SELECT id FROM organization');
    const results: Array<{ orgId: string; slaRuns: boolean; scheduleRuns: boolean }> = [];

    for (const org of orgResult.rows) {
      try {
        await AutomationService.runSla({ orgId: org.id });
        await AutomationService.runScheduled({ orgId: org.id });
        results.push({ orgId: org.id, slaRuns: true, scheduleRuns: true });
      } catch (error) {
        console.error('[PM SLA Cron] Failed for org:', org.id, error);
        results.push({ orgId: org.id, slaRuns: false, scheduleRuns: false });
      }
    }

    return NextResponse.json({ success: true, data: { processed: results.length, results } });
  } catch (error) {
    console.error('[PM SLA Cron] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
