import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ChannelSyncWorker } from '@/lib/workers/channel-sync-worker';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

/**
 * Manual trigger endpoint for syncing all channels
 * In production, this should be called by a scheduled job/cron
 */
export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);

    // Run sync in background (don't wait for completion)
    ChannelSyncWorker.syncAllChannels(orgId).catch(error => {
      console.error('Error in background sync:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Sync started for all channels',
    });
  } catch (error: unknown) {
    console.error('Error starting sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start sync',
      },
      { status: 500 }
    );
  }
}

