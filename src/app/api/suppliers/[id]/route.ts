import { NextRequest, NextResponse } from 'next/server'
import { getSupplierById as ssotGet, upsertSupplier as ssotUpsert } from '@/services/ssot/supplierService'
import { CacheInvalidator } from '@/lib/cache/invalidation'
import { PostgreSQLSupplierRepository } from '@/lib/suppliers/core/SupplierRepository'



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get supplier name before deletion (for cache invalidation)
    const supplier = await ssotGet(id)
    const supplierName = supplier?.name

    // HARD DELETE - actually remove the supplier from the database
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
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete supplier',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
