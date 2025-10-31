import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database/unified-connection'
import type { SupplierContact } from '@/types/supplier'

/**
 * GET /api/directories/suppliers
 * Returns suppliers with their contacts for the directory view
 * Uses the simplest possible queries that actually work
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000
    const offset = (page - 1) * limit

    // Use the simplest possible query - just get suppliers from core.supplier (the actual table)
    let suppliersQuery = `
      SELECT 
        supplier_id as id,
        name,
        code,
        active,
        contact_info,
        default_currency as currency,
        created_at,
        updated_at
      FROM core.supplier
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (search) {
      suppliersQuery += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    suppliersQuery += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    // Get suppliers
    const suppliersResult = await query(suppliersQuery, params)
    const suppliers = suppliersResult.rows || []

    // Get count
    let countQuery = `SELECT COUNT(*) as count FROM core.supplier WHERE 1=1`
    const countParams: any[] = []
    let countParamIndex = 1

    if (search) {
      countQuery += ` AND (name ILIKE $${countParamIndex} OR code ILIKE $${countParamIndex})`
      countParams.push(`%${search}%`)
      countParamIndex++
    }

    const countResult = await query(countQuery, countParams)
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

    // Get contacts for all suppliers
    const supplierIds = suppliers.map((s: any) => s.id).filter(Boolean)
    
    let contactsBySupplier: Record<string, SupplierContact[]> = {}
    
    if (supplierIds.length > 0) {
      try {
        const contactsQuery = `
          SELECT 
            id,
            CAST(supplier_id AS TEXT) as supplier_id,
            type,
            name,
            title,
            email,
            phone,
            mobile,
            department,
            is_primary,
            is_active
          FROM supplier_contacts
          WHERE CAST(supplier_id AS TEXT) = ANY($1)
          AND is_active = true
        `

        const contactsResult = await query(contactsQuery, [supplierIds])

        // Group contacts by supplier_id
        contactsResult.rows?.forEach((contact: any) => {
          const supplierId = String(contact.supplier_id)
          if (!contactsBySupplier[supplierId]) {
            contactsBySupplier[supplierId] = []
          }
          contactsBySupplier[supplierId].push({
            id: String(contact.id),
            type: (contact.type || 'primary') as any,
            name: contact.name || '',
            title: contact.title || '',
            email: contact.email || '',
            phone: contact.phone || '',
            mobile: contact.mobile,
            department: contact.department,
            isPrimary: contact.is_primary || false,
            isActive: contact.is_active !== false,
          })
        })
      } catch (contactError) {
        // If contacts table doesn't exist or has issues, just continue without contacts
        console.warn('Could not fetch contacts:', contactError)
      }
    }

    // Combine suppliers with contacts
    const suppliersWithContacts = suppliers.map((supplier: any) => {
      const supplierId = String(supplier.id)
      const contactInfo = supplier.contact_info || {}
      
      return {
        id: supplierId,
        name: supplier.name,
        code: supplier.code || '',
        status: supplier.active ? 'active' : 'inactive',
        tier: 'approved' as const,
        category: '',
        subcategory: '',
        tags: [],
        contacts: contactsBySupplier[supplierId] || [],
        addresses: [],
      }
    })

    return NextResponse.json({
      success: true,
      data: suppliersWithContacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching suppliers directory:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}

