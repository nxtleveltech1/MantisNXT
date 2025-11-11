import { NextResponse } from 'next/server';
import { getUncategorizedProducts } from '@/lib/cmm/sip-product-enrichment';
import { suggestCategoriesBatch } from '@/lib/cmm/category-ai';
import { bulkAssignCategories } from '@/lib/cmm/sip-category-assignment';
import { resolveOrgId } from '@/lib/ai/model-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplier_id, // Optional: filter by supplier
      confidence_threshold = 0.7, // Minimum confidence to auto-assign
      batch_size = 50, // Process in batches
      assigned_by, // User who triggered the assignment
    } = body || {};

    const orgId = resolveOrgId(null);

    // Get uncategorized products from SIP
    const { products } = await getUncategorizedProducts({
      supplier_id,
      limit: 1000, // Process up to 1000 at a time
    });

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No uncategorized products found',
        assigned: 0,
        total: 0,
      });
    }

    // Use new category AI module (handles categories internally, timeouts, batching)
    const batchSuggestions = await suggestCategoriesBatch(products, undefined, orgId, {
      batchSize: batch_size,
      batchDelayMs: 2000, // 2 second delay between batches
    });

    // Convert batch suggestions to assignments
    const assignments: Array<{
      supplierProductId: string;
      categoryId: string;
      assignedBy?: string;
      method: 'ai_auto' | 'ai_manual_accept' | 'manual';
      aiConfidence?: number;
      aiReasoning?: string;
    }> = [];

    for (const [productId, suggestion] of batchSuggestions.entries()) {
      if (suggestion.confidence >= confidence_threshold && suggestion.categoryId) {
        assignments.push({
          supplierProductId: productId,
          categoryId: suggestion.categoryId,
          assignedBy: assigned_by || undefined,
          method: 'ai_auto',
          aiConfidence: suggestion.confidence,
          aiReasoning: suggestion.reasoning || undefined,
        });
      }
    }

    // Bulk assign categories
    const result = await bulkAssignCategories(assignments);

    return NextResponse.json({
      success: true,
      message: `Auto-assigned categories to ${result.success} products`,
      assigned: result.success,
      failed: result.failed,
      total: products.length,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('Auto-assign error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to auto-assign categories',
        assigned: 0,
      },
      { status: 500 }
    );
  }
}
