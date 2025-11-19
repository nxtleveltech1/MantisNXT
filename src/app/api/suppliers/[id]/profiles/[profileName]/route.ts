import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileName: string }> }
) {
  try {
    const { id, profileName } = await params
    const body = await request.json()

    const supplier_id = body?.supplierId || id
    const guidelines = body?.guidelines || body?.guidelines || {}
    const processing_config = body?.processingConfig || body?.processing_config || {}
    const quality_standards = body?.qualityStandards || body?.quality_standards || {}
    const compliance_rules = body?.complianceRules || body?.compliance_rules || {}
    const is_active = body?.is_active ?? true

    if (!supplier_id) {
      return NextResponse.json({ success: false, error: 'supplier_id required' }, { status: 400 })
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
      RETURNING id, supplier_id, profile_name, guidelines, processing_config, quality_standards, compliance_rules, is_active, updated_at
    `
    
    const res = await query(upsertSql, [
      supplier_id,
      profileName,
      JSON.stringify(guidelines),
      JSON.stringify(processing_config),
      JSON.stringify(quality_standards),
      JSON.stringify(compliance_rules),
      is_active,
    ])

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: res.rows[0],
      message: 'Profile updated successfully'
    })
  } catch (error: any) {
    console.error('Update supplier profile API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Failed to update supplier profile' 
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileName: string }> }
) {
  try {
    const { id, profileName } = await params

    const sql = `
      SELECT id, supplier_id, profile_name, guidelines, processing_config, quality_standards, compliance_rules, is_active, updated_at
      FROM public.supplier_profiles
      WHERE supplier_id = $1 AND profile_name = $2
      ORDER BY updated_at DESC
      LIMIT 1
    `
    
    const res = await query(sql, [id, profileName])

    if (res.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Profile not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: res.rows[0] 
    })
  } catch (error: any) {
    console.error('Get supplier profile API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Failed to fetch supplier profile' 
    }, { status: 500 })
  }
}