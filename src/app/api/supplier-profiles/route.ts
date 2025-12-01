import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const supplierId = url.searchParams.get('supplier_id') || undefined;
    const profileName = url.searchParams.get('profile_name') || undefined;
    let sql = `
      SELECT id, supplier_id, profile_name, guidelines, processing_config, quality_standards, compliance_rules, is_active, updated_at
      FROM public.supplier_profiles
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let idx = 1;
    if (supplierId) {
      sql += ` AND supplier_id = $${idx++}`;
      params.push(supplierId);
    }
    if (profileName) {
      sql += ` AND profile_name = $${idx++}`;
      params.push(profileName);
    }
    sql += ` ORDER BY supplier_id, profile_name`;
    const res = await query(sql, params);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to list profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supplier_id: string = body?.supplier_id;
    const profile_name: string = body?.profile_name || 'default';
    const guidelines = body?.guidelines ?? {};
    const processing_config = body?.processing_config ?? {};
    const quality_standards = body?.quality_standards ?? {};
    const compliance_rules = body?.compliance_rules ?? {};
    const is_active: boolean = body?.is_active ?? true;

    if (!supplier_id) {
      return NextResponse.json({ success: false, error: 'supplier_id required' }, { status: 400 });
    }

    const upsertSql = `
      INSERT INTO public.supplier_profiles (
        supplier_id, profile_name, guidelines, processing_config, quality_standards, compliance_rules, is_active
      ) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7)
      ON CONFLICT (supplier_id, profile_name)
      DO UPDATE SET
        guidelines = EXCLUDED.guidelines,
        processing_config = EXCLUDED.processing_config,
        quality_standards = EXCLUDED.quality_standards,
        compliance_rules = EXCLUDED.compliance_rules,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id
    `;
    const res = await query(upsertSql, [
      supplier_id,
      profile_name,
      JSON.stringify(guidelines),
      JSON.stringify(processing_config),
      JSON.stringify(quality_standards),
      JSON.stringify(compliance_rules),
      is_active,
    ]);

    return NextResponse.json({ success: true, id: res.rows[0]?.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to upsert profile' },
      { status: 400 }
    );
  }
}
