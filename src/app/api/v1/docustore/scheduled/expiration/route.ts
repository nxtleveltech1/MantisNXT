/**
 * Scheduled Document Expiration Management
 * 
 * This endpoint should be called by a cron job or scheduled task to:
 * - Send expiration warnings
 * - Auto-archive expired documents
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ExpirationService } from '@/lib/services/docustore/expiration-service';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Get org ID from request or process all orgs
    const orgId = request.headers.get('x-org-id') || undefined;
    
    if (orgId) {
      // Process single organization
      await processExpirationForOrg(orgId);
    } else {
      // Process all organizations
      const orgsResult = await query<{ id: string }>(
        'SELECT id FROM organization WHERE status = $1',
        ['active']
      );
      
      for (const org of orgsResult.rows) {
        await processExpirationForOrg(org.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Expiration processing completed',
    });
  } catch (error: unknown) {
    console.error('Error processing document expiration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process expiration',
      },
      { status: 500 }
    );
  }
}

async function processExpirationForOrg(orgId: string): Promise<void> {
  // Send expiration warnings
  await ExpirationService.sendExpirationWarnings(orgId, [30, 14, 7, 1]);
  
  // Auto-archive expired documents
  const archivedCount = await ExpirationService.autoArchiveExpired(orgId);
  
  console.log(`Processed expiration for org ${orgId}: Archived ${archivedCount} documents`);
}

