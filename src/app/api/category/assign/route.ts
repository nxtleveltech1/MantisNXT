import { NextResponse } from 'next/server';
import { assignCategoryToSupplierProduct } from '@/lib/cmm/sip-category-assignment';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sku,
      categoryId,
      supplierProductId, // New: support SIP product ID
      assignedBy,
      method,
      aiConfidence,
      aiReasoning,
    } = body;

    // Support both legacy SKU-based and new supplier_product_id-based assignment
    if (supplierProductId && categoryId) {
      // New SIP-based assignment
      await assignCategoryToSupplierProduct(
        supplierProductId,
        categoryId,
        assignedBy,
        method || 'manual',
        aiConfidence,
        aiReasoning
      );

      return NextResponse.json({
        success: true,
        message: 'Category assigned successfully',
      });
    } else if (sku && categoryId) {
      // Legacy SKU-based assignment - keep for backward compatibility
      const { assignCategory } = await import('@/lib/cmm/db-sql');
      await assignCategory(sku, categoryId);

      return NextResponse.json({
        success: true,
        message: 'Category assigned successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Either (supplierProductId and categoryId) or (sku and categoryId) are required',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Category assign error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign category',
      },
      { status: 500 }
    );
  }
}
