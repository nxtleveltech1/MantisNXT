/**
 * Run All Scheduled Tasks
 * 
 * This endpoint runs all scheduled DocuStore tasks:
 * - Document expiration processing
 * - Scheduled report generation
 * 
 * Should be called by a cron job daily
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ExpirationService, ScheduledGenerationService } from '@/lib/services/docustore';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Get org ID from request or process all orgs
    const orgId = request.headers.get('x-org-id') || undefined;
    const userId = request.headers.get('x-user-id') || undefined;
    
    const results = {
      expiration: { processed: 0, archived: 0 },
      reports: { daily: 0, weekly: 0, monthly: 0 },
    };
    
    if (orgId) {
      // Process single organization
      const expirationResult = await processExpirationForOrg(orgId);
      const reportsResult = await processReportsForOrg(orgId, userId);
      
      results.expiration = expirationResult;
      results.reports = reportsResult;
    } else {
      // Process all organizations
      const orgsResult = await query<{ id: string }>(
        'SELECT id FROM organization WHERE status = $1',
        ['active']
      );
      
      for (const org of orgsResult.rows) {
        const expirationResult = await processExpirationForOrg(org.id);
        const reportsResult = await processReportsForOrg(org.id, userId);
        
        results.expiration.processed += expirationResult.processed;
        results.expiration.archived += expirationResult.archived;
        results.reports.daily += reportsResult.daily;
        results.reports.weekly += reportsResult.weekly;
        results.reports.monthly += reportsResult.monthly;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All scheduled tasks completed',
      results,
    });
  } catch (error: unknown) {
    console.error('Error running scheduled tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run scheduled tasks',
      },
      { status: 500 }
    );
  }
}

async function processExpirationForOrg(orgId: string): Promise<{ processed: number; archived: number }> {
  // Send expiration warnings
  await ExpirationService.sendExpirationWarnings(orgId, [30, 14, 7, 1]);
  
  // Auto-archive expired documents
  const archivedCount = await ExpirationService.autoArchiveExpired(orgId);
  
  return {
    processed: 1,
    archived: archivedCount,
  };
}

async function processReportsForOrg(
  orgId: string,
  userId: string | undefined
): Promise<{ daily: number; weekly: number; monthly: number }> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const dayOfMonth = now.getDate();
  
  let daily = 0;
  let weekly = 0;
  let monthly = 0;
  
  // Daily reports (every day)
  try {
    await ScheduledGenerationService.generateDailyReports(orgId, userId);
    daily = 1;
  } catch (error) {
    console.error(`Error generating daily reports for org ${orgId}:`, error);
  }
  
  // Weekly reports (every Monday)
  if (dayOfWeek === 1) {
    try {
      await ScheduledGenerationService.generateWeeklyReports(orgId, userId);
      weekly = 1;
    } catch (error) {
      console.error(`Error generating weekly reports for org ${orgId}:`, error);
    }
  }
  
  // Monthly reports (1st of month)
  if (dayOfMonth === 1) {
    try {
      await ScheduledGenerationService.generateMonthlyReports(orgId, userId);
      monthly = 1;
    } catch (error) {
      console.error(`Error generating monthly reports for org ${orgId}:`, error);
    }
  }
  
  return { daily, weekly, monthly };
}

