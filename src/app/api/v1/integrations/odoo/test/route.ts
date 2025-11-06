/**
 * Odoo Connection Test API
 *
 * Tests connection to Odoo ERP server using provided credentials
 * Now with rate limiting, caching, and retry logic to prevent 429 errors
 *
 * Author: Claude Code
 * Date: 2025-11-04 (Updated with rate limiting)
 */

import { NextRequest, NextResponse } from 'next/server';
import { OdooService } from '@/lib/services/OdooService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { server_url, database_name, username, api_key } = body;

    if (!server_url || !database_name || !username || !api_key) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: server_url, database_name, username, api_key',
        },
        { status: 400 }
      );
    }

    // Normalize server URL (remove trailing slash)
    const normalizedUrl = server_url.replace(/\/$/, '');

    // Use OdooService with built-in rate limiting and caching
    const odooService = new OdooService({
      url: normalizedUrl,
      database: database_name,
      username: username,
      password: api_key,
    });

    try {
      console.log(`[Odoo Test] Testing connection to: ${normalizedUrl}, database: ${database_name}`);
      
      // Test connection (uses cached auth if available)
      const connectionResult = await odooService.testConnection();

      if (!connectionResult.success) {
        console.error('[Odoo Test] Connection failed:', connectionResult.error);
        return NextResponse.json(
          {
            success: false,
            error: connectionResult.error || 'Connection test failed. Please verify your credentials.',
          },
          { status: 401 }
        );
      }
      
      console.log('[Odoo Test] Connection successful');

      // Get version info (rate-limited)
      let odooVersion = 'Unknown';
      let serverVersionInfo: any = null;
      try {
        const versionInfo = await odooService.version();
        odooVersion = versionInfo?.server_version || versionInfo?.server_serie || 'Unknown';
        serverVersionInfo = versionInfo;
      } catch (versionError: any) {
        console.warn('Could not fetch Odoo version:', versionError);
        // If version check fails with HTML error, provide helpful message
        if (versionError?.message?.includes('Unknown XML-RPC tag') || 
            versionError?.message?.includes('TITLE')) {
          return NextResponse.json(
            {
              success: false,
              error: 
                `Odoo server returned HTML instead of XML-RPC response.\n\n` +
                `Common causes:\n` +
                `1. Incorrect server URL (check: ${normalizedUrl})\n` +
                `2. XML-RPC endpoint disabled or redirecting to login page\n` +
                `3. Server URL should be the base domain only (e.g., https://company.odoo.sh)\n` +
                `4. Try accessing ${normalizedUrl}/xmlrpc/2/common in a browser to verify\n\n` +
                `For Odoo.sh: Ensure you're using the correct instance URL\n` +
                `For self-hosted: Verify XML-RPC is enabled in Odoo configuration`,
            },
            { status: 400 }
          );
        }
      }

      // Detect if this is an Odoo.sh instance
      const isOdooSh = normalizedUrl.includes('.odoo.sh');

      return NextResponse.json({
        success: true,
        data: {
          message: 'Successfully connected to Odoo ERP server',
          odoo_version: odooVersion,
          database: database_name,
          server_url: normalizedUrl,
          environment: isOdooSh ? 'odoo.sh' : 'self-hosted',
          cached_auth: true, // Auth is now cached for 60 minutes
          server_info: serverVersionInfo,
        },
      });
    } catch (error: any) {
      console.error('Odoo connection test error:', error);

      // Handle specific error cases
      if (error.message?.includes('rate limited') || error.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit reached. Please wait a moment and try again.',
            retry_after: 60, // seconds
          },
          { status: 429 }
        );
      }

      if (error.message?.includes('Circuit breaker is open')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Service temporarily unavailable due to repeated failures. Please try again later.',
          },
          { status: 503 }
        );
      }

      if (error.message?.includes('Invalid Odoo credentials')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed. Please check your database name, username, and API key/password.',
          },
          { status: 401 }
        );
      }

      throw error;
    }
  } catch (error: any) {
    console.error('Error testing Odoo connection:', error);

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not reach the Odoo server. Please check your server URL.',
        },
        { status: 503 }
      );
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection timed out. The Odoo server may be slow or unreachable.',
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to test connection',
      },
      { status: 500 }
    );
  }
}
