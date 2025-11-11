import { withAuth } from '@/middleware/api-auth'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { query } from '@/lib/database/unified-connection'

export const DELETE = withAuth(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Inventory item ID is required' },
        { status: 400 }
      )
    }

    // Delete from stock_on_hand table (inventory_items is a view based on this table)
    // The id from the view corresponds to soh_id in stock_on_hand
    const result = await query(
      'DELETE FROM stock_on_hand WHERE soh_id = $1 RETURNING soh_id',
      [id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully'
    })
  } catch (error) {
    console.error('Delete inventory item error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete inventory item'
      },
      { status: 500 }
    )
  }
})
