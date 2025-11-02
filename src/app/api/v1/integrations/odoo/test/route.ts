/**
 * Odoo Connection Test API
 *
 * Tests connection to Odoo ERP server using provided credentials
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';

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

    // Test connection using Odoo's XML-RPC API
    // First, authenticate to get the user ID
    const authUrl = `${normalizedUrl}/xmlrpc/2/common`;

    const authPayload = `<?xml version="1.0"?>
<methodCall>
  <methodName>authenticate</methodName>
  <params>
    <param><value><string>${database_name}</string></value></param>
    <param><value><string>${username}</string></value></param>
    <param><value><string>${api_key}</string></value></param>
    <param><value><struct></struct></value></param>
  </params>
</methodCall>`;

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: authPayload,
    });

    if (!authResponse.ok) {
      console.error('Odoo authentication error:', authResponse.status, await authResponse.text());

      if (authResponse.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: 'Odoo server not found. Please verify your server URL.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Odoo server returned error: ${authResponse.status} ${authResponse.statusText}`,
        },
        { status: authResponse.status }
      );
    }

    const authResponseText = await authResponse.text();

    // Parse XML response to check for authentication success
    // A successful authentication returns a user ID (integer)
    // A failed authentication returns a fault or false
    if (authResponseText.includes('<fault>') || authResponseText.includes('<boolean>0</boolean>')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed. Please check your database name, username, and API key/password.',
        },
        { status: 401 }
      );
    }

    // Extract user ID from response
    const userIdMatch = authResponseText.match(/<int>(\d+)<\/int>/);
    if (!userIdMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unexpected response from Odoo server. Could not verify authentication.',
        },
        { status: 500 }
      );
    }

    const userId = userIdMatch[1];

    // Get Odoo version information
    const versionUrl = `${normalizedUrl}/xmlrpc/2/common`;
    const versionPayload = `<?xml version="1.0"?>
<methodCall>
  <methodName>version</methodName>
  <params></params>
</methodCall>`;

    const versionResponse = await fetch(versionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: versionPayload,
    });

    let odooVersion = 'Unknown';
    if (versionResponse.ok) {
      const versionText = await versionResponse.text();
      const serverVersionMatch = versionText.match(/<string>server_version<\/string>\s*<\/member>\s*<member>\s*<value>\s*<string>([\d.]+)<\/string>/);
      if (serverVersionMatch) {
        odooVersion = serverVersionMatch[1];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Successfully connected to Odoo ERP server',
        user_id: userId,
        odoo_version: odooVersion,
        database: database_name,
      },
    });
  } catch (error: any) {
    console.error('Error testing Odoo connection:', error);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not reach the Odoo server. Please check your server URL.',
        },
        { status: 503 }
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
