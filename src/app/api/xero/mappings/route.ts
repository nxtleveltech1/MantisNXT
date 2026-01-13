/**
 * Xero Account Mappings
 * 
 * GET /api/xero/mappings - Get current account mappings
 * POST /api/xero/mappings - Save account mappings
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database';
import type { XeroAccountMappingKey } from '@/lib/xero/types';

interface AccountMapping {
  mappingKey: string;
  displayName: string;
  description: string | null;
  xeroAccountId: string | null;
  xeroAccountCode: string | null;
  xeroAccountName: string | null;
  isRequired: boolean;
}

/**
 * GET - Retrieve current account mappings
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected.' },
        { status: 400 }
      );
    }

    // Get default mapping keys with current mappings
    const result = await query<{
      mapping_key: string;
      display_name: string;
      description: string | null;
      default_xero_account_code: string | null;
      is_required: boolean;
      xero_account_id: string | null;
      xero_account_code: string | null;
      xero_account_name: string | null;
    }>(
      `SELECT 
        d.mapping_key,
        d.display_name,
        d.description,
        d.default_xero_account_code,
        d.is_required,
        m.xero_account_id,
        m.xero_account_code,
        m.xero_account_name
      FROM xero_account_mapping_defaults d
      LEFT JOIN xero_account_mappings m 
        ON m.mapping_key = d.mapping_key AND m.org_id = $1
      ORDER BY d.sort_order`,
      [orgId]
    );

    const mappings: AccountMapping[] = result.rows.map(row => ({
      mappingKey: row.mapping_key,
      displayName: row.display_name,
      description: row.description,
      xeroAccountId: row.xero_account_id,
      xeroAccountCode: row.xero_account_code || row.default_xero_account_code,
      xeroAccountName: row.xero_account_name,
      isRequired: row.is_required,
    }));

    return NextResponse.json({
      success: true,
      mappings,
    });

  } catch (error) {
    console.error('[Xero Mappings] GET Error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch account mappings' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save account mappings
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { mappings } = body as { 
      mappings: Array<{
        mappingKey: string;
        xeroAccountId: string;
        xeroAccountCode: string;
        xeroAccountName?: string;
      }> 
    };

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { mappings: [...] }' },
        { status: 400 }
      );
    }

    // Validate required mappings
    const requiredResult = await query<{ mapping_key: string }>(
      `SELECT mapping_key FROM xero_account_mapping_defaults WHERE is_required = true`
    );
    const requiredKeys = requiredResult.rows.map(r => r.mapping_key);
    const providedKeys = mappings.map(m => m.mappingKey);
    const missingRequired = requiredKeys.filter(k => !providedKeys.includes(k));

    if (missingRequired.length > 0) {
      return NextResponse.json(
        { 
          error: `Missing required mappings: ${missingRequired.join(', ')}`,
          missingKeys: missingRequired,
        },
        { status: 400 }
      );
    }

    // Save mappings
    for (const mapping of mappings) {
      await query(
        `INSERT INTO xero_account_mappings (
          org_id, mapping_key, xero_account_id, xero_account_code, xero_account_name
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (org_id, mapping_key)
        DO UPDATE SET
          xero_account_id = EXCLUDED.xero_account_id,
          xero_account_code = EXCLUDED.xero_account_code,
          xero_account_name = EXCLUDED.xero_account_name,
          updated_at = NOW()`,
        [
          orgId,
          mapping.mappingKey,
          mapping.xeroAccountId,
          mapping.xeroAccountCode,
          mapping.xeroAccountName || null,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${mappings.length} account mappings`,
    });

  } catch (error) {
    console.error('[Xero Mappings] POST Error:', error);
    
    return NextResponse.json(
      { error: 'Failed to save account mappings' },
      { status: 500 }
    );
  }
}
