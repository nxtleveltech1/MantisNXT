import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { SupplierRulePayloadSchema } from '@/types/rules-config'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = SupplierRulePayloadSchema.partial().parse(body)

    const existing = await query('SELECT * FROM public.supplier_rules WHERE id = $1 LIMIT 1', [id])
    if (existing.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const fields: string[] = []
    const values: unknown[] = []
    let idx = 1
    if (validated.supplier_id) { fields.push(`supplier_id = $${idx++}`); values.push(validated.supplier_id) }
    if (validated.rule_name) { fields.push(`rule_name = $${idx++}`); values.push(validated.rule_name) }
    if (validated.rule_type) { fields.push(`rule_type = $${idx++}`); values.push(validated.rule_type) }
    if (validated.trigger_event) { fields.push(`trigger_event = $${idx++}`); values.push(validated.trigger_event) }
    if (validated.execution_order != null) { fields.push(`execution_order = $${idx++}`); values.push(validated.execution_order) }
    if (validated.rule_config) { fields.push(`rule_config = $${idx++}::jsonb`); values.push(JSON.stringify(validated.rule_config)) }
    if (validated.is_blocking != null) { fields.push(`is_blocking = $${idx++}`); values.push(validated.is_blocking) }
    fields.push(`updated_at = NOW()`)
    values.push(id)

    const sql = `UPDATE public.supplier_rules SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`
    const res = await query(sql, values)

    try {
      const auditCheck = await query("SELECT to_regclass('public.audit_log') AS rel")
      if (auditCheck.rows?.[0]?.rel) {
        await query(
          `INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data, timestamp)
           VALUES (NULL, 'update', 'supplier_rules', $1, $2::jsonb, $3::jsonb, NOW())`,
          [id, JSON.stringify(existing.rows[0]), JSON.stringify(res.rows[0])]
        )
      }
    } catch {}

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update rule' }, { status: 400 })
  }
}