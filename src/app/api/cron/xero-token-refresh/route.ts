/**
 * Xero Token Refresh Cron
 *
 * GET /api/cron/xero-token-refresh
 *
 * Proactively refreshes Xero access tokens for all orgs with active connections
 * so tokens stay valid without user action (connect-once, stay connected).
 * Runs every 20 minutes via Vercel cron.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  getAllActiveConnections,
  getValidTokenSet,
} from '@/lib/xero/token-manager';
import { isXeroConfigured } from '@/lib/xero/client';
import { isAuthError } from '@/lib/xero/errors';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isCronAuthorized(request: NextRequest): boolean {
  if (request.headers.get('x-vercel-cron') === '1') return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === secret) return true;
  if (request.headers.get('x-cron-secret') === secret) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isXeroConfigured()) {
      return NextResponse.json({
        success: true,
        refreshed: 0,
        errors: [],
        message: 'Xero not configured; skipping.',
      });
    }

    const orgIds = await getAllActiveConnections();
    let refreshed = 0;
    const errors: Array<{ orgId: string; message: string }> = [];

    for (const orgId of orgIds) {
      try {
        await getValidTokenSet(orgId);
        refreshed += 1;
      } catch (error) {
        const message = isAuthError(error)
          ? (error as Error).message
          : error instanceof Error
            ? error.message
            : 'Unknown error';
        console.error('[Xero Token Refresh Cron] Failed for org:', orgId, error);
        errors.push({ orgId, message });
      }
    }

    return NextResponse.json({
      success: true,
      refreshed,
      total: orgIds.length,
      errors,
    });
  } catch (error) {
    console.error('[Xero Token Refresh Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
