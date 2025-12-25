/**
 * Scheduled Report Generation
 * 
 * This endpoint should be called by a cron job or scheduled task to:
 * - Generate daily reports
 * - Generate weekly reports
 * - Generate monthly reports
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ScheduledGenerationService } from '@/lib/services/docustore/scheduled-generation';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const scheduleType = body.type || 'all'; // 'daily', 'weekly', 'monthly', 'all'
    
    // Get org ID from request or process all orgs
    const orgId = request.headers.get('x-org-id') || undefined;
    const userId = request.headers.get('x-user-id') || undefined;
    
    if (orgId) {
      // Process single organization
      await processReportsForOrg(orgId, userId, scheduleType);
    } else {
      // Process all organizations
      const orgsResult = await query<{ id: string }>(
        'SELECT id FROM organization WHERE status = $1',
        ['active']
      );
      
      for (const org of orgsResult.rows) {
        await processReportsForOrg(org.id, userId, scheduleType);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scheduled report generation completed for ${scheduleType}`,
    });
  } catch (error: unknown) {
    console.error('Error generating scheduled reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate scheduled reports',
      },
      { status: 500 }
    );
  }
}

async function processReportsForOrg(
  orgId: string,
  userId: string | undefined,
  scheduleType: string
): Promise<void> {
  if (scheduleType === 'daily' || scheduleType === 'all') {
    await ScheduledGenerationService.generateDailyReports(orgId, userId);
  }
  
  if (scheduleType === 'weekly' || scheduleType === 'all') {
    await ScheduledGenerationService.generateWeeklyReports(orgId, userId);
  }
  
  if (scheduleType === 'monthly' || scheduleType === 'all') {
    await ScheduledGenerationService.generateMonthlyReports(orgId, userId);
  }
  
  console.log(`Generated ${scheduleType} reports for org ${orgId}`);
}

