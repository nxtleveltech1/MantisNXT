/**
 * Supplier Discount Rules API
 * CRUD operations for supplier discount rules (category/brand/SKU level discounts)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Validation schema for discount rule
const DiscountRuleSchema = z.object({
  rule_name: z.string().min(1).max(200),
  discount_percent: z.number().min(0).max(100),
  scope_type: z.enum(['supplier', 'category', 'brand', 'sku']),
  category_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  supplier_sku: z.string().max(100).nullable().optional(),
  priority: z.number().int().default(0),
  is_active: z.boolean().default(true),
  valid_from: z.string().datetime().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/suppliers/[id]/discount-rules
 * List all discount rules for a supplier
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const scopeType = url.searchParams.get('scope_type');
    const isActive = url.searchParams.get('is_active');

    let sql = `
      SELECT 
        dr.discount_rule_id,
        dr.supplier_id,
        dr.rule_name,
        dr.discount_percent,
        dr.scope_type,
        dr.category_id,
        dr.brand_id,
        dr.supplier_sku,
        dr.priority,
        dr.is_active,
        dr.valid_from,
        dr.valid_until,
        dr.created_at,
        dr.updated_at,
        c.name as category_name,
        c.path as category_path,
        b.name as brand_name
      FROM core.supplier_discount_rules dr
      LEFT JOIN core.category c ON dr.category_id = c.category_id
      LEFT JOIN public.brand b ON dr.brand_id = b.id
      WHERE dr.supplier_id = $1
    `;

    const queryParams: unknown[] = [id];
    let paramCount = 2;

    if (scopeType) {
      sql += ` AND dr.scope_type = $${paramCount++}`;
      queryParams.push(scopeType);
    }

    if (isActive !== null) {
      sql += ` AND dr.is_active = $${paramCount++}`;
      queryParams.push(isActive === 'true');
    }

    sql += ` ORDER BY dr.priority DESC, dr.created_at DESC`;

    const result = await query(sql, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get discount rules API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch discount rules',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/[id]/discount-rules
 * Create a new discount rule
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate scope-specific fields
    if (body.scope_type === 'category' && !body.category_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'category_id is required when scope_type is category',
        },
        { status: 400 }
      );
    }

    if (body.scope_type === 'brand' && !body.brand_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'brand_id is required when scope_type is brand',
        },
        { status: 400 }
      );
    }

    if (body.scope_type === 'sku' && !body.supplier_sku) {
      return NextResponse.json(
        {
          success: false,
          error: 'supplier_sku is required when scope_type is sku',
        },
        { status: 400 }
      );
    }

    const validated = DiscountRuleSchema.parse({
      ...body,
      category_id: body.scope_type === 'category' ? body.category_id : null,
      brand_id: body.scope_type === 'brand' ? body.brand_id : null,
      supplier_sku: body.scope_type === 'sku' ? body.supplier_sku : null,
      valid_from: body.valid_from || new Date().toISOString(),
    });

    const sql = `
      INSERT INTO core.supplier_discount_rules (
        supplier_id, rule_name, discount_percent, scope_type,
        category_id, brand_id, supplier_sku, priority, is_active,
        valid_from, valid_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        discount_rule_id, supplier_id, rule_name, discount_percent, scope_type,
        category_id, brand_id, supplier_sku, priority, is_active,
        valid_from, valid_until, created_at, updated_at
    `;

    const result = await query(sql, [
      id,
      validated.rule_name,
      validated.discount_percent,
      validated.scope_type,
      validated.category_id || null,
      validated.brand_id || null,
      validated.supplier_sku || null,
      validated.priority,
      validated.is_active,
      validated.valid_from ? new Date(validated.valid_from) : new Date(),
      validated.valid_until ? new Date(validated.valid_until) : null,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create discount rule',
        },
        { status: 500 }
      );
    }

    // Fetch with joins for full details
    const fullResult = await query(
      `
      SELECT 
        dr.discount_rule_id,
        dr.supplier_id,
        dr.rule_name,
        dr.discount_percent,
        dr.scope_type,
        dr.category_id,
        dr.brand_id,
        dr.supplier_sku,
        dr.priority,
        dr.is_active,
        dr.valid_from,
        dr.valid_until,
        dr.created_at,
        dr.updated_at,
        c.name as category_name,
        c.path as category_path,
        b.name as brand_name
      FROM core.supplier_discount_rules dr
      LEFT JOIN core.category c ON dr.category_id = c.category_id
      LEFT JOIN public.brand b ON dr.brand_id = b.id
      WHERE dr.discount_rule_id = $1
    `,
      [result.rows[0].discount_rule_id]
    );

    return NextResponse.json(
      {
        success: true,
        data: fullResult.rows[0],
        message: 'Discount rule created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create discount rule API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle unique constraint violations
    if (error?.message?.includes('unique') || error?.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          error: 'A discount rule with this scope already exists for this supplier',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create discount rule',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/suppliers/[id]/discount-rules
 * Update an existing discount rule
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.discount_rule_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'discount_rule_id is required',
        },
        { status: 400 }
      );
    }

    // Verify the rule exists and belongs to this supplier
    const checkSql = `
      SELECT discount_rule_id FROM core.supplier_discount_rules 
      WHERE discount_rule_id = $1 AND supplier_id = $2
    `;
    const checkResult = await query(checkSql, [body.discount_rule_id, id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Discount rule not found or does not belong to this supplier',
        },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (body.rule_name !== undefined) {
      updates.push(`rule_name = $${paramCount++}`);
      values.push(body.rule_name);
    }

    if (body.discount_percent !== undefined) {
      updates.push(`discount_percent = $${paramCount++}`);
      values.push(body.discount_percent);
    }

    if (body.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(body.priority);
    }

    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(body.is_active);
    }

    if (body.valid_from !== undefined) {
      updates.push(`valid_from = $${paramCount++}`);
      values.push(body.valid_from ? new Date(body.valid_from) : null);
    }

    if (body.valid_until !== undefined) {
      updates.push(`valid_until = $${paramCount++}`);
      values.push(body.valid_until ? new Date(body.valid_until) : null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No fields to update',
        },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(body.discount_rule_id, id);

    const sql = `
      UPDATE core.supplier_discount_rules 
      SET ${updates.join(', ')}
      WHERE discount_rule_id = $${paramCount++} AND supplier_id = $${paramCount++}
      RETURNING 
        discount_rule_id, supplier_id, rule_name, discount_percent, scope_type,
        category_id, brand_id, supplier_sku, priority, is_active,
        valid_from, valid_until, created_at, updated_at
    `;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update discount rule',
        },
        { status: 500 }
      );
    }

    // Fetch with joins for full details
    const fullResult = await query(
      `
      SELECT 
        dr.discount_rule_id,
        dr.supplier_id,
        dr.rule_name,
        dr.discount_percent,
        dr.scope_type,
        dr.category_id,
        dr.brand_id,
        dr.supplier_sku,
        dr.priority,
        dr.is_active,
        dr.valid_from,
        dr.valid_until,
        dr.created_at,
        dr.updated_at,
        c.name as category_name,
        c.path as category_path,
        b.name as brand_name
      FROM core.supplier_discount_rules dr
      LEFT JOIN core.category c ON dr.category_id = c.category_id
      LEFT JOIN public.brand b ON dr.brand_id = b.id
      WHERE dr.discount_rule_id = $1
    `,
      [body.discount_rule_id]
    );

    return NextResponse.json({
      success: true,
      data: fullResult.rows[0],
      message: 'Discount rule updated successfully',
    });
  } catch (error: any) {
    console.error('Update discount rule API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update discount rule',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/suppliers/[id]/discount-rules?discount_rule_id=...
 * Delete a discount rule
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const discountRuleId = searchParams.get('discount_rule_id');

    if (!discountRuleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'discount_rule_id parameter is required',
        },
        { status: 400 }
      );
    }

    // Verify the rule exists and belongs to this supplier
    const checkSql = `
      SELECT discount_rule_id, rule_name FROM core.supplier_discount_rules 
      WHERE discount_rule_id = $1 AND supplier_id = $2
    `;
    const checkResult = await query(checkSql, [discountRuleId, id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Discount rule not found or does not belong to this supplier',
        },
        { status: 404 }
      );
    }

    const sql = `
      DELETE FROM core.supplier_discount_rules 
      WHERE discount_rule_id = $1 AND supplier_id = $2
      RETURNING discount_rule_id, rule_name
    `;

    const result = await query(sql, [discountRuleId, id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete discount rule',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Discount rule '${result.rows[0].rule_name}' deleted successfully`,
      data: { discount_rule_id: result.rows[0].discount_rule_id },
    });
  } catch (error: any) {
    console.error('Delete discount rule API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to delete discount rule',
      },
      { status: 500 }
    );
  }
}

