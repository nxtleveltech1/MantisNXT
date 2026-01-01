/**
 * Brands API
 * Create and list brands (master data)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Get organization ID from request context
 * Tries: body -> header -> query -> env -> database -> fallback
 */
async function getOrgIdFromRequest(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string> {
  // 1. Check request body
  if (body) {
    const bodyOrgId =
      typeof body.orgId === 'string'
        ? body.orgId
        : typeof body.org_id === 'string'
          ? body.org_id
          : null;
    if (bodyOrgId && UUID_REGEX.test(bodyOrgId)) {
      return bodyOrgId;
    }
  }

  // 2. Check headers
  const headerOrg = request.headers.get('x-org-id') ?? request.headers.get('x-organization-id');
  if (headerOrg && UUID_REGEX.test(headerOrg)) {
    return headerOrg;
  }

  // 3. Check query params
  const urlOrg = new URL(request.url).searchParams.get('orgId');
  if (urlOrg && UUID_REGEX.test(urlOrg)) {
    return urlOrg;
  }

  // 4. Check environment variable
  const envOrgId = process.env.DEFAULT_ORG_ID;
  if (envOrgId && UUID_REGEX.test(envOrgId)) {
    return envOrgId;
  }

  // 5. Try database
  try {
    const result = await query<{ id: string }>(
      'SELECT id FROM public.organization ORDER BY created_at LIMIT 1'
    );
    if (result.rows && result.rows.length > 0) {
      return result.rows[0].id;
    }
  } catch (error) {
    console.warn('Failed to fetch organization from database:', error);
  }

  // 6. Fallback to known default
  return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
}

/**
 * Get supplier's org_id from supplier_id
 */
async function getSupplierOrgId(supplierId: string): Promise<string | null> {
  try {
    // Try core.supplier first
    const coreResult = await query<{ org_id: string; organization_id: string }>(
      'SELECT org_id, organization_id FROM core.supplier WHERE supplier_id = $1',
      [supplierId]
    );

    if (coreResult.rows.length > 0) {
      const row = coreResult.rows[0];
      return row.org_id || row.organization_id || null;
    }

    // Try public.supplier as fallback
    const publicResult = await query<{ org_id: string }>(
      'SELECT org_id FROM public.supplier WHERE id = $1',
      [supplierId]
    );

    if (publicResult.rows.length > 0) {
      return publicResult.rows[0].org_id || null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching supplier org_id:', error);
    return null;
  }
}

/**
 * GET /api/brands
 * List brands (optional, for future use)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    const search = url.searchParams.get('search') || '';

    let sql = `
      SELECT 
        id as brand_id,
        name as brand_name,
        description,
        logo_url,
        website,
        is_active,
        created_at,
        updated_at
      FROM public.brand
      WHERE is_active = true
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (orgId && UUID_REGEX.test(orgId)) {
      sql += ` AND org_id = $${paramIndex}`;
      params.push(orgId);
      paramIndex++;
    }

    if (search) {
      sql += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get brands API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch brands',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brands
 * Create new brand
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : null;
    const logoUrl = typeof body?.logo_url === 'string' ? body.logo_url.trim() : null;
    const website = typeof body?.website === 'string' ? body.website.trim() : null;
    const supplierId = typeof body?.supplier_id === 'string' ? body.supplier_id : null;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Brand name is required' },
        { status: 400 }
      );
    }

    // Get org_id: from supplier if provided, otherwise from request context
    let orgId: string;
    if (supplierId) {
      const supplierOrgId = await getSupplierOrgId(supplierId);
      if (supplierOrgId) {
        orgId = supplierOrgId;
      } else {
        orgId = await getOrgIdFromRequest(request, body);
      }
    } else {
      orgId = await getOrgIdFromRequest(request, body);
    }

    // Validate logo_url and website formats if provided
    if (logoUrl && !logoUrl.match(/^https?:\/\//)) {
      return NextResponse.json(
        { success: false, message: 'Logo URL must start with http:// or https://' },
        { status: 400 }
      );
    }

    if (website && !website.match(/^https?:\/\//)) {
      return NextResponse.json(
        { success: false, message: 'Website must start with http:// or https://' },
        { status: 400 }
      );
    }

    // Check for existing brand (case-insensitive, per organization)
    const existingResult = await query<{ id: string; name: string }>(
      'SELECT id, name FROM public.brand WHERE org_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))',
      [orgId, name]
    );

    if (existingResult.rows.length > 0) {
      // Return existing brand (idempotent behavior)
      const existing = existingResult.rows[0];
      return NextResponse.json(
        {
          success: true,
          brand: {
            id: existing.id,
            name: existing.name,
            description,
            logo_url: logoUrl,
            website,
          },
          message: 'Brand already exists',
        },
        { status: 200 }
      );
    }

    // Create new brand
    const insertResult = await query<{
      id: string;
      name: string;
      description: string | null;
      logo_url: string | null;
      website: string | null;
      is_active: boolean;
      created_at: Date;
    }>(
      `
      INSERT INTO public.brand (org_id, name, description, logo_url, website, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id, name, description, logo_url, website, is_active, created_at
    `,
      [orgId, name, description, logoUrl, website]
    );

    const created = insertResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        brand: {
          id: created.id,
          name: created.name,
          description: created.description,
          logo_url: created.logo_url,
          website: created.website,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create brand API error:', error);

    // Handle unique constraint violation
    if (error?.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'A brand with this name already exists for this organization.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create brand',
      },
      { status: 500 }
    );
  }
}


