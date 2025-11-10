/**
 * Category Validation Service
 * Real-time validation of category assignments
 */

import { query as dbQuery } from "@/lib/database/unified-connection"
import type { EnrichedProduct } from "./sip-product-enrichment"

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate that a category exists and is active
 */
export async function validateCategoryExists(categoryId: string): Promise<ValidationResult> {
  const result = await dbQuery<{ category_id: string; is_active: boolean }>(
    "SELECT category_id, is_active FROM core.category WHERE category_id = $1",
    [categoryId]
  )

  if (result.rows.length === 0) {
    return {
      valid: false,
      errors: [`Category ${categoryId} does not exist`],
      warnings: [],
    }
  }

  if (!result.rows[0].is_active) {
    return {
      valid: false,
      errors: [`Category ${categoryId} is not active`],
      warnings: [],
    }
  }

  return {
    valid: true,
    errors: [],
    warnings: [],
  }
}

/**
 * Validate category assignment for a product
 */
export async function validateCategoryAssignment(
  product: EnrichedProduct,
  categoryId: string
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Check category exists
  const categoryCheck = await validateCategoryExists(categoryId)
  if (!categoryCheck.valid) {
    errors.push(...categoryCheck.errors)
    return { valid: false, errors, warnings }
  }

  // Check if product already has this category
  if (product.category_id === categoryId) {
    warnings.push("Product already has this category assigned")
  }

  // Check if supplier typically uses different categories
  const supplierCategoryStats = await dbQuery<{
    category_id: string
    category_name: string
    count: number
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
  )

  if (supplierCategoryStats.rows.length > 0) {
    const typicalCategories = supplierCategoryStats.rows.map((r) => r.category_id)
    if (!typicalCategories.includes(categoryId)) {
      const topCategory = supplierCategoryStats.rows[0]
      warnings.push(
        `Supplier "${product.supplier_name}" typically uses category "${topCategory.category_name}" (${topCategory.count} products). This assignment may be unusual.`
      )
    }
  }

  // Check if product attributes align with category
  // This is a basic check - can be enhanced with ML-based validation
  if (product.attrs_json) {
    const attrs = JSON.stringify(product.attrs_json).toLowerCase()
    const categoryName = await dbQuery<{ name: string }>(
      "SELECT name FROM core.category WHERE category_id = $1",
      [categoryId]
    )

    if (categoryName.rows.length > 0) {
      const catName = categoryName.rows[0].name.toLowerCase()
      // Basic keyword matching - can be enhanced
      if (!attrs.includes(catName.split(" ")[0])) {
        warnings.push(
          `Product attributes don't clearly indicate category "${categoryName.rows[0].name}"`
        )
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate multiple category assignments
 */
export async function validateBulkAssignments(
  assignments: Array<{ supplierProductId: string; categoryId: string }>
): Promise<Array<{ supplierProductId: string; validation: ValidationResult }>> {
  const results = await Promise.all(
    assignments.map(async (assignment) => {
      // Get product data
      const productResult = await dbQuery<EnrichedProduct>(
        `SELECT 
          sp.supplier_product_id,
          sp.supplier_id,
          sp.supplier_sku,
          sp.name_from_supplier,
          sp.category_id,
          c.name AS category_name,
          c.path AS category_path,
          s.name AS supplier_name,
          s.code AS supplier_code,
          sp.brand,
          sp.uom,
          sp.pack_size,
          sp.barcode,
          sp.attrs_json,
          sp.is_active,
          sp.is_new,
          sp.first_seen_at,
          sp.last_seen_at,
          NULL::text AS category_raw,
          NULL::numeric AS current_price,
          NULL::text AS currency,
          NULL::int AS qty_on_hand,
          NULL::int AS qty_on_order
        FROM core.supplier_product sp
        JOIN core.supplier s ON s.supplier_id = sp.supplier_id
        LEFT JOIN core.category c ON c.category_id = sp.category_id
        WHERE sp.supplier_product_id = $1`,
        [assignment.supplierProductId]
      )

      if (productResult.rows.length === 0) {
        return {
          supplierProductId: assignment.supplierProductId,
          validation: {
            valid: false,
            errors: ["Product not found"],
            warnings: [],
          },
        }
      }

      const product = productResult.rows[0] as EnrichedProduct
      const validation = await validateCategoryAssignment(product, assignment.categoryId)

      return {
        supplierProductId: assignment.supplierProductId,
        validation,
      }
    })
  )

  return results
}

/**
 * Check for conflicting assignments (same product, multiple categories)
 */
export async function checkConflictingAssignments(
  assignments: Array<{ supplierProductId: string; categoryId: string }>
): Promise<Array<{ supplierProductId: string; conflicts: string[] }>> {
  const productMap = new Map<string, string[]>()

  // Group assignments by product
  for (const assignment of assignments) {
    const existing = productMap.get(assignment.supplierProductId) || []
    if (!existing.includes(assignment.categoryId)) {
      existing.push(assignment.categoryId)
    }
    productMap.set(assignment.supplierProductId, existing)
  }

  // Find conflicts
  const conflicts: Array<{ supplierProductId: string; conflicts: string[] }> = []

  for (const [productId, categoryIds] of productMap.entries()) {
    if (categoryIds.length > 1) {
      conflicts.push({
        supplierProductId: productId,
        conflicts: categoryIds,
      })
    }
  }

  return conflicts
}





