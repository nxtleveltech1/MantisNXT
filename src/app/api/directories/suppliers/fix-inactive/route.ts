import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';

/**
 * GET /api/directories/suppliers/fix-inactive
 * Diagnostic endpoint to check and optionally fix suppliers that should be inactive
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fix = searchParams.get('fix') === 'true';

    // Check for suppliers that might need to be deactivated
    // This is a diagnostic query - adjust based on your business rules
    const diagnosticQuery = `
      SELECT 
        supplier_id as id,
        name,
        code,
        active,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM core.stock_location WHERE supplier_id = core.supplier.supplier_id) as location_count,
        (SELECT COUNT(*) FROM core.supplier_product WHERE supplier_id = core.supplier.supplier_id) as product_count
      FROM core.supplier
      WHERE active = true
      ORDER BY name
    `;

    const result = await query(diagnosticQuery);
    const suppliers = result.rows || [];

    if (!fix) {
      // Just return diagnostic info
      return NextResponse.json({
        success: true,
        diagnostic: true,
        totalActive: suppliers.length,
        suppliers: suppliers.map((s: unknown) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          active: s.active,
          locationCount: parseInt(s.location_count || '0', 10),
          productCount: parseInt(s.product_count || '0', 10),
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        })),
        message: 'Use ?fix=true to deactivate suppliers that should be inactive',
      });
    }

    // Fix mode: deactivate suppliers that have no dependencies and might be orphaned
    // This is a conservative approach - only deactivate if explicitly requested
    const fixed: string[] = [];
    const errors: string[] = [];

    for (const supplier of suppliers) {
      const locationCount = parseInt(supplier.location_count || '0', 10);
      const productCount = parseInt(supplier.product_count || '0', 10);

      // Only deactivate if there are truly no dependencies
      // You might want to adjust this logic based on your business rules
      if (locationCount === 0 && productCount === 0) {
        try {
          await query(
            `UPDATE core.supplier SET active = false, updated_at = NOW() WHERE supplier_id = $1`,
            [supplier.id]
          );
          fixed.push(supplier.id);
        } catch (error) {
          errors.push(
            `${supplier.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      fixed: fixed.length,
      errors: errors.length,
      fixedIds: fixed,
      errorsList: errors,
      message: `Fixed ${fixed.length} suppliers, ${errors.length} errors`,
    });
  } catch (error) {
    console.error('Error in fix-inactive endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
