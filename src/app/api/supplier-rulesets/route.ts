import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { SupplierRulePayloadSchema } from '@/types/rules-config'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const supplierId = url.searchParams.get('supplier_id') || undefined
    const sql = `
      SELECT id, supplier_id, rule_name, rule_type, trigger_event, execution_order,
             rule_config, error_message_template, is_blocking, is_active, created_at, updated_at
      FROM public.supplier_rules
      ${supplierId ? 'WHERE supplier_id = $1' : ''}
      ORDER BY supplier_id, execution_order, id
    `
    const res = await query(sql, supplierId ? [supplierId] : [])
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to list rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = SupplierRulePayloadSchema.parse(body)
    const sql = `
      INSERT INTO public.supplier_rules (
        supplier_id, rule_name, rule_type, trigger_event, execution_order, rule_config, is_blocking, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, true)
      RETURNING id
    `
    const res = await query(sql, [
      validated.supplier_id,
      validated.rule_name,
      validated.rule_type,
      validated.trigger_event,
      validated.execution_order,
      JSON.stringify(validated.rule_config),
      validated.is_blocking,
    ])

    // optional audit if table exists
    try {
      const auditCheck = await query("SELECT to_regclass('public.audit_log') AS rel")
      if (auditCheck.rows?.[0]?.rel) {
        await query(
          `INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data, timestamp)
           VALUES (NULL, 'insert', 'supplier_rules', $1, $2::jsonb, NOW())`,
          [res.rows[0].id, JSON.stringify(validated)]
        )
      }
    } catch {}

    return NextResponse.json({ success: true, id: res.rows[0].id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create rule' }, { status: 400 })
  }
}