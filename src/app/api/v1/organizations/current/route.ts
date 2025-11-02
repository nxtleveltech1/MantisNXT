/**
 * Current Organization API
 *
 * Returns the organization ID for the current context.
 * Emergency implementation for WooCommerce sync fix.
 *
 * TEMPORARY: Uses environment variable or hardcoded UUID
 * TODO: Integrate with authentication to return user's actual organization
 *
 * Author: Claude Code (Incident Response)
 * Date: 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

/**
 * GET /api/v1/organizations/current
 * Returns the current organization ID
 */
export async function GET(request: NextRequest) {
  try {
    // EMERGENCY FIX: Try multiple approaches to get a valid org_id

    // 1. Check environment variable
    const envOrgId = process.env.DEFAULT_ORG_ID;
    if (envOrgId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(envOrgId)) {
        return NextResponse.json({
          success: true,
          data: {
            id: envOrgId,
            name: 'Default Organization',
            slug: 'default',
            source: 'environment',
          },
        });
      }
    }

    // 2. Try to fetch from database with timeout handling
    try {
      const result = await Promise.race([
        query<any>(`SELECT id, name, slug FROM organization ORDER BY created_at LIMIT 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout')), 3000))
      ]) as any;

      if (result.rows && result.rows.length > 0) {
        const org = result.rows[0];
        return NextResponse.json({
          success: true,
          data: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            source: 'database',
          },
        });
      }
    } catch (dbError: any) {
      console.warn('Database query failed or timed out:', dbError.message);
      // Continue to fallback
    }

    // 3. LAST RESORT: Use a well-known UUID for emergency
    // This UUID should be replaced with a real org_id from your database
    const EMERGENCY_ORG_ID = '00000000-0000-0000-0000-000000000001';
    console.warn(`⚠️ EMERGENCY FALLBACK: Using hardcoded org_id ${EMERGENCY_ORG_ID}`);
    console.warn('⚠️ Set DEFAULT_ORG_ID environment variable or create organization in database');

    return NextResponse.json({
      success: true,
      data: {
        id: EMERGENCY_ORG_ID,
        name: 'Emergency Default Organization',
        slug: 'emergency-default',
        source: 'fallback',
      },
      warning: 'Using emergency fallback org_id. Please configure DEFAULT_ORG_ID environment variable.',
    });

  } catch (error: any) {
    console.error('Error fetching current organization:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch organization',
      },
      { status: 500 }
    );
  }
}
