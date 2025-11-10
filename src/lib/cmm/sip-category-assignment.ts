/**
 * Category Assignment Functions for SIP Products
 * Works with core.supplier_product table
 */

import { query as dbQuery, withTransaction } from "@/lib/database/unified-connection"

/**
 * Assign category to a supplier product
 */
export async function assignCategoryToSupplierProduct(
  supplierProductId: string,
  categoryId: string,
  assignedBy?: string,
  method: "ai_auto" | "ai_manual_accept" | "manual" = "manual",
  aiConfidence?: number,
  aiReasoning?: string
): Promise<void> {
  // Verify category exists
  const catCheck = await dbQuery<{ category_id: string }>(
    "SELECT category_id FROM core.category WHERE category_id = $1 AND is_active = true",
    [categoryId]
  )
  if (catCheck.rows.length === 0) {
    throw new Error("Category not found or inactive")
  }

  // Verify product exists
  const prodCheck = await dbQuery<{ supplier_product_id: string; category_id: string | null }>(
    "SELECT supplier_product_id, category_id FROM core.supplier_product WHERE supplier_product_id = $1",
    [supplierProductId]
  )
  if (prodCheck.rows.length === 0) {
    throw new Error("Supplier product not found")
  }

  const oldCategoryId = prodCheck.rows[0].category_id

  await withTransaction(async (client) => {
    // Update category
    await client.query(
      "UPDATE core.supplier_product SET category_id = $1, updated_at = NOW() WHERE supplier_product_id = $2",
      [categoryId, supplierProductId]
    )

    // Log to audit table (if it exists)
    try {
      await client.query(
        `INSERT INTO core.category_assignment_audit 
         (supplier_product_id, old_category_id, new_category_id, assignment_method, ai_confidence, ai_reasoning, assigned_by, assigned_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [supplierProductId, oldCategoryId, categoryId, method, aiConfidence || null, aiReasoning || null, assignedBy || null]
      )
    } catch (error) {
      // Audit table might not exist yet - log warning but don't fail
      console.warn("Failed to write to audit log (table may not exist):", error)
    }
  })
}

/**
 * Bulk assign categories to supplier products
 */
export async function bulkAssignCategories(
  assignments: Array<{
    supplierProductId: string
    categoryId: string
    assignedBy?: string
    method?: "ai_auto" | "ai_manual_accept" | "manual"
    aiConfidence?: number
    aiReasoning?: string
  }>
): Promise<{ success: number; failed: number; errors: Array<{ productId: string; error: string }> }> {
  let success = 0
  let failed = 0
  const errors: Array<{ productId: string; error: string }> = []

  for (const assignment of assignments) {
    try {
      await assignCategoryToSupplierProduct(
        assignment.supplierProductId,
        assignment.categoryId,
        assignment.assignedBy,
        assignment.method || "manual",
        assignment.aiConfidence,
        assignment.aiReasoning
      )
      success++
    } catch (error) {
      failed++
      errors.push({
        productId: assignment.supplierProductId,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return { success, failed, errors }
}






