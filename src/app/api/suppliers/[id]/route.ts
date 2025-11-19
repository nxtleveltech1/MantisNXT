import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { getSupplierById as ssotGet, upsertSupplier as ssotUpsert, deactivateSupplier as ssotDeactivate } from '@/services/ssot/supplierService'
import { query as dbQuery } from '@/lib/database/unified-connection'
import { CacheInvalidator } from '@/lib/cache/invalidation'
import { PostgreSQLSupplierRepository } from '@/lib/suppliers/core/SupplierRepository'



export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supplier = await ssotGet(id)

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supplier not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: supplier
    })
  } catch (error) {
    console.error('Get supplier API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch supplier',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const supplier = await ssotUpsert({ id, name: body?.name, status: body?.status })

    // Invalidate cache after successful update
    CacheInvalidator.invalidateSupplier(id, supplier.name)

    return NextResponse.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully'
    })
  } catch (error) {
    console.error('Update supplier API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update supplier',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Get supplier name before deletion (for cache invalidation)
    const supplier = await ssotGet(id)
    const supplierName = supplier?.name

    // Check for dependent records that block hard delete
    const [locRes, spRes] = await Promise.all([
      dbQuery<{ count: string }>('SELECT COUNT(*)::int as count FROM core.stock_location WHERE supplier_id = $1', [id]),
      dbQuery<{ count: string }>('SELECT COUNT(*)::int as count FROM core.supplier_product WHERE supplier_id = $1', [id]),
    ])
    const hasDependencies = (parseInt(locRes.rows[0]?.count || '0') > 0) || (parseInt(spRes.rows[0]?.count || '0') > 0)

    if (hasDependencies) {
      // Soft delete (deactivate) when FK dependencies exist
      await ssotDeactivate(id)
      CacheInvalidator.invalidateSupplier(id, supplierName)
      return NextResponse.json({ success: true, message: 'Supplier deactivated (has linked records)' })
    }

    // No dependencies: proceed with hard delete
    const repository = new PostgreSQLSupplierRepository()
    await repository.delete(id)

    // Invalidate cache after successful deletion
    CacheInvalidator.invalidateSupplier(id, supplierName)

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully'
    })
  } catch (error) {
    console.error('Delete supplier API error:', error)
    // If FK constraint error sneaks through, fallback to soft delete
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('foreign key') || message.toLowerCase().includes('constraint')) {
      try {
        const { id } = await params
        await ssotDeactivate(id)
        return NextResponse.json({ success: true, message: 'Supplier deactivated (linked records prevented deletion)' })
      } catch (e) {
        // fall through to error response below
      }
    }
    return NextResponse.json({ success: false, error: 'Failed to delete supplier', message: message || 'Unknown error' }, { status: 500 })
  }
}
