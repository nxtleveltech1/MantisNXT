/**
 * Environment Variables Diagnostic
 *
 * GET /api/xero/test/env-check
 *
 * Checks if required Xero environment variables are set
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    timestamp: new Date().toISOString(),
    xero_client_id: {
      set: Boolean(process.env.XERO_CLIENT_ID),
      length: process.env.XERO_CLIENT_ID?.length || 0,
    },
    xero_client_secret: {
      set: Boolean(process.env.XERO_CLIENT_SECRET),
      length: process.env.XERO_CLIENT_SECRET?.length || 0,
    },
    next_public_app_url: {
      set: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      value: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    },
    pii_encryption_key: {
      set: Boolean(process.env.PII_ENCRYPTION_KEY),
      length: process.env.PII_ENCRYPTION_KEY?.length || 0,
    },
    xero_webhook_key: {
      set: Boolean(process.env.XERO_WEBHOOK_KEY),
      length: process.env.XERO_WEBHOOK_KEY?.length || 0,
    },
    database_url: {
      set: Boolean(process.env.DATABASE_URL),
      masked: process.env.DATABASE_URL ? '***SET***' : 'not set',
    },
  };

  return NextResponse.json(envCheck);
}