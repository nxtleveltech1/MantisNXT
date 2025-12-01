// @ts-nocheck

/**
 * Conflict Detection Service
 * Identifies ambiguous category assignments and potential mismatches
 */

import type { CategorySuggestion, EnrichedProduct } from './sip-product-enrichment';
import { query as dbQuery } from '@/lib/database/unified-connection';

export interface CategoryConflict {
  supplier_product_id: string;
  supplier_sku: string;
  product_name: string;
  conflict_type: 'ambiguous' | 'mismatch' | 'hierarchy_conflict' | 'manual_override_history';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestions: Array<{
    category_id: string;
    category_name: string;
    confidence: number;
    reasoning?: string;
  }>;
  current_category_id?: string | null;
  current_category_name?: string | null;
}

/**
 * Detect conflicts for a product with multiple suggestions
 */
export function detectAmbiguousAssignment(
  product: EnrichedProduct,
  suggestions: CategorySuggestion[]
): CategoryConflict | null {
  if (suggestions.length < 2) {
    return null;
  }

  // Filter high-confidence suggestions (>0.75)
  const highConfidenceSuggestions = suggestions.filter(s => s.confidence > 0.75);

  if (highConfidenceSuggestions.length < 2) {
    return null;
  }

  // Check if top suggestions are close in confidence (within 0.1)
  const sorted = highConfidenceSuggestions.sort((a, b) => b.confidence - a.confidence);
  const topConfidence = sorted[0].confidence;
  const secondConfidence = sorted[1].confidence;

  if (topConfidence - secondConfidence < 0.1) {
    return {
      supplier_product_id: product.supplier_product_id,
      supplier_sku: product.supplier_sku,
      product_name: product.name_from_supplier,
      conflict_type: 'ambiguous',
      severity: topConfidence > 0.85 ? 'high' : 'medium',
      message: `Multiple categories with similar high confidence scores. Top suggestion: ${sorted[0].categoryName} (${(topConfidence * 100).toFixed(1)}%), Second: ${sorted[1].categoryName} (${(secondConfidence * 100).toFixed(1)}%)`,
      suggestions: sorted.slice(0, 3).map(s => ({
        category_id: s.categoryId,
        category_name: s.categoryName,
        confidence: s.confidence,
        reasoning: s.reasoning,
      })),
      current_category_id: product.category_id,
      current_category_name: product.category_name,
    };
  }

  return null;
}

/**
 * Detect category mismatch (product doesn't fit category characteristics)
 */
export function detectCategoryMismatch(
  product: EnrichedProduct,
  suggestion: CategorySuggestion
): CategoryConflict | null {
  if (!product.category_id) {
    return null; // No current category to compare
  }

  // If AI suggests a different category with high confidence, flag as potential mismatch
  if (suggestion.categoryId !== product.category_id && suggestion.confidence > 0.8) {
    return {
      supplier_product_id: product.supplier_product_id,
      supplier_sku: product.supplier_sku,
      product_name: product.name_from_supplier,
      conflict_type: 'mismatch',
      severity: suggestion.confidence > 0.9 ? 'high' : 'medium',
      message: `Product is currently categorized as "${product.category_name}" but AI suggests "${suggestion.categoryName}" with ${(suggestion.confidence * 100).toFixed(1)}% confidence.`,
      suggestions: [
        {
          category_id: suggestion.categoryId,
          category_name: suggestion.categoryName,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
        },
      ],
      current_category_id: product.category_id,
      current_category_name: product.category_name,
    };
  }

  return null;
}

/**
 * Detect hierarchy conflicts (suggested category conflicts with supplier's product line)
 */
export async function detectHierarchyConflict(
  product: EnrichedProduct,
  suggestion: CategorySuggestion
): Promise<CategoryConflict | null> {
  // Check if supplier typically uses different categories
  const supplierCategoryStats = await dbQuery<{
    category_id: string;
    category_name: string;
    count: number;
  }>(
    `SELECT 
      sp.category_id,
      c.name AS category_name,
      COUNT(*)::int AS count
    FROM core.supplier_product sp
    JOIN core.category c ON c.category_id = sp.category_id
    WHERE sp.supplier_id = $1
      AND sp.category_id IS NOT NULL
      AND sp.is_active = true
    GROUP BY sp.category_id, c.name
    ORDER BY count DESC
    LIMIT 5`,
    [product.supplier_id]
  );

  if (supplierCategoryStats.rows.length === 0) {
    return null;
  }

  // Check if suggested category is not in supplier's typical categories
  const typicalCategories = supplierCategoryStats.rows.map(r => r.category_id);
  if (!typicalCategories.includes(suggestion.categoryId)) {
    const topCategory = supplierCategoryStats.rows[0];
    return {
      supplier_product_id: product.supplier_product_id,
      supplier_sku: product.supplier_sku,
      product_name: product.name_from_supplier,
      conflict_type: 'hierarchy_conflict',
      severity: 'medium',
      message: `Supplier "${product.supplier_name}" typically uses category "${topCategory.category_name}" (${topCategory.count} products), but AI suggests "${suggestion.categoryName}".`,
      suggestions: [
        {
          category_id: suggestion.categoryId,
          category_name: suggestion.categoryName,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
        },
      ],
      current_category_id: product.category_id,
      current_category_name: product.category_name,
    };
  }

  return null;
}

/**
 * Check for manual override history (product was manually recategorized multiple times)
 */
export async function detectManualOverrideHistory(
  product: EnrichedProduct
): Promise<CategoryConflict | null> {
  try {
    const auditHistory = await dbQuery<{
      old_category_id: string | null;
      new_category_id: string | null;
      assignment_method: string;
      assigned_at: Date;
    }>(
      `SELECT 
        old_category_id,
        new_category_id,
        assignment_method,
        assigned_at
      FROM core.category_assignment_audit
      WHERE supplier_product_id = $1
      ORDER BY assigned_at DESC
      LIMIT 10`,
      [product.supplier_product_id]
    );

    if (auditHistory.rows.length < 3) {
      return null;
    }

    // Count manual overrides
    const manualOverrides = auditHistory.rows.filter(
      r => r.assignment_method === 'manual' || r.assignment_method === 'ai_manual_accept'
    ).length;

    if (manualOverrides >= 2) {
      return {
        supplier_product_id: product.supplier_product_id,
        supplier_sku: product.supplier_sku,
        product_name: product.name_from_supplier,
        conflict_type: 'manual_override_history',
        severity: 'low',
        message: `Product has been manually recategorized ${manualOverrides} times. May need review to determine correct category.`,
        suggestions: [],
        current_category_id: product.category_id,
        current_category_name: product.category_name,
      };
    }
  } catch (error) {
    // Audit table might not exist - ignore
    console.warn('Failed to check audit history:', error);
  }

  return null;
}

/**
 * Detect all conflicts for a product
 */
export async function detectAllConflicts(
  product: EnrichedProduct,
  suggestions: CategorySuggestion[]
): Promise<CategoryConflict[]> {
  const conflicts: CategoryConflict[] = [];

  // Check for ambiguous assignment
  const ambiguous = detectAmbiguousAssignment(product, suggestions);
  if (ambiguous) {
    conflicts.push(ambiguous);
  }

  // Check for category mismatch
  if (suggestions.length > 0) {
    const mismatch = detectCategoryMismatch(product, suggestions[0]);
    if (mismatch) {
      conflicts.push(mismatch);
    }
  }

  // Check for hierarchy conflict
  if (suggestions.length > 0) {
    const hierarchyConflict = await detectHierarchyConflict(product, suggestions[0]);
    if (hierarchyConflict) {
      conflicts.push(hierarchyConflict);
    }
  }

  // Check for manual override history
  const overrideHistory = await detectManualOverrideHistory(product);
  if (overrideHistory) {
    conflicts.push(overrideHistory);
  }

  return conflicts;
}

/**
 * Get all products with conflicts
 */
export async function getProductsWithConflicts(limit: number = 100): Promise<CategoryConflict[]> {
  // This would typically query products that have been flagged
  // For now, return empty array - conflicts are detected on-demand
  return [];
}
