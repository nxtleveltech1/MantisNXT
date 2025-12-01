import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const triggerEvent = url.searchParams.get('trigger_event') || 'pricelist_upload';

    const sql = `
      SELECT id, supplier_id, rule_name, rule_type, trigger_event, execution_order,
             rule_config, error_message_template, is_blocking, created_at, updated_at
      FROM public.supplier_rules
      WHERE supplier_id = $1 AND trigger_event = $2
      ORDER BY execution_order ASC, created_at ASC
    `;

    const res = await query(sql, [id, triggerEvent]);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error: any) {
    console.error('Get supplier rules API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch supplier rules',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const {
      rule_name,
      rule_type,
      trigger_event,
      execution_order,
      rule_config,
      error_message_template,
      is_blocking,
    } = body;

    if (!rule_name || !trigger_event) {
      return NextResponse.json(
        {
          success: false,
          error: 'rule_name and trigger_event are required',
        },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO public.supplier_rules (
        supplier_id, rule_name, rule_type, trigger_event, execution_order, rule_config, error_message_template, is_blocking
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      RETURNING id, supplier_id, rule_name, rule_type, trigger_event, execution_order, rule_config, error_message_template, is_blocking, created_at, updated_at
    `;

    const res = await query(sql, [
      id,
      rule_name,
      rule_type || 'validation',
      trigger_event,
      execution_order || 0,
      JSON.stringify(rule_config || {}),
      error_message_template || '',
      is_blocking ?? false,
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create rule',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: res.rows[0],
        message: 'Rule created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create supplier rule API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create supplier rule',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const {
      rule_id,
      rule_name,
      rule_type,
      trigger_event,
      execution_order,
      rule_config,
      error_message_template,
      is_blocking,
    } = body;

    if (!rule_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'rule_id is required',
        },
        { status: 400 }
      );
    }

    // Verify the rule exists and belongs to this supplier
    const checkSql = `
      SELECT id FROM public.supplier_rules 
      WHERE id = $1 AND supplier_id = $2
    `;
    const checkRes = await query(checkSql, [rule_id, id]);

    if (checkRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rule not found or does not belong to this supplier',
        },
        { status: 404 }
      );
    }

    const sql = `
      UPDATE public.supplier_rules 
      SET 
        rule_name = COALESCE($1, rule_name),
        rule_type = COALESCE($2, rule_type),
        trigger_event = COALESCE($3, trigger_event),
        execution_order = COALESCE($4, execution_order),
        rule_config = COALESCE($5::jsonb, rule_config),
        error_message_template = COALESCE($6, error_message_template),
        is_blocking = COALESCE($7, is_blocking),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND supplier_id = $9
      RETURNING id, supplier_id, rule_name, rule_type, trigger_event, execution_order, rule_config, error_message_template, is_blocking, created_at, updated_at
    `;

    const res = await query(sql, [
      rule_name,
      rule_type,
      trigger_event,
      execution_order,
      JSON.stringify(rule_config || null),
      error_message_template,
      is_blocking,
      rule_id,
      id,
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update rule',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
      message: 'Rule updated successfully',
    });
  } catch (error: any) {
    console.error('Update supplier rule API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update supplier rule',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('rule_id');

    if (!ruleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'rule_id parameter is required',
        },
        { status: 400 }
      );
    }

    // Verify the rule exists and belongs to this supplier
    const checkSql = `
      SELECT id FROM public.supplier_rules 
      WHERE id = $1 AND supplier_id = $2
    `;
    const checkRes = await query(checkSql, [ruleId, id]);

    if (checkRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rule not found or does not belong to this supplier',
        },
        { status: 404 }
      );
    }

    const sql = `
      DELETE FROM public.supplier_rules 
      WHERE id = $1 AND supplier_id = $2
      RETURNING id, rule_name
    `;

    const res = await query(sql, [ruleId, id]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete rule',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Rule '${res.rows[0].rule_name}' deleted successfully`,
      data: { id: res.rows[0].id },
    });
  } catch (error: any) {
    console.error('Delete supplier rule API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to delete supplier rule',
      },
      { status: 500 }
    );
  }
}
