import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const sql = `
      ALTER TABLE spp.supplier_rules 
      ADD COLUMN IF NOT EXISTS error_message_template TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS trigger_event VARCHAR(100) DEFAULT 'pricelist_upload'
    `
    
    await query(sql)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Fixed supplier_rules table - added missing columns' 
    })
  } catch (error) {
    console.error('Fix failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Fix failed' 
    }, { status: 500 })
  }
}