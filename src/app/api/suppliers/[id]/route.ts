import { NextRequest, NextResponse } from 'next/server'
import { SupplierAPI } from '@/lib/api/suppliers'
import { CacheInvalidator } from '@/lib/cache/invalidation'



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supplier = await SupplierAPI.getSupplierById(id)

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

    const supplier = await SupplierAPI.updateSupplier(id, body)

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
    const supplier = await SupplierAPI.getSupplierById(id)
    const supplierName = supplier?.name

    await SupplierAPI.deleteSupplier(id)

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

