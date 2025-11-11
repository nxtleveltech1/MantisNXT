import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { query as dbQuery } from "@/lib/database/unified-connection"

type ConflictRow = {
  supplier_product_id: string
  supplier_id: string
  supplier_sku: string
  name_from_supplier: string
  category_id: string | null
  current_category_name: string | null
  ai_confidence: number | null
  ai_reasoning: string | null
  ai_categorization_status: string | null
  updated_at: Date | string | null
  first_seen_at: Date | string | null
  proposals: Array<{
    proposed_category_id?: string
    category_id?: string | null
    category_name?: string | null
    confidence?: number | null
    reasoning?: string | null
    provider?: string | null
    created_at?: string | Date | null
  }>
}

export async function GET() {
  try {
    const schemaMode = await getSchemaMode()

    if (schemaMode !== "core") {
      return NextResponse.json({ success: true, conflicts: [] })
    }

    const { rows } = await dbQuery<ConflictRow & { proposals: unknown }>(`
      SELECT
        sp.supplier_product_id,
        sp.supplier_id,
        sp.supplier_sku,
        sp.name_from_supplier,
        sp.category_id,
        c.name AS current_category_name,
        sp.ai_confidence,
        sp.ai_reasoning,
        sp.ai_categorization_status,
        sp.updated_at,
        sp.first_seen_at,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'proposed_category_id', pcp.proposed_category_id,
                'category_id', pc.suggested_parent_id,
                'category_name', pc.display_name,
                'confidence', pcp.ai_confidence,
                'reasoning', pcp.ai_reasoning,
                'provider', pcp.ai_provider,
                'created_at', pcp.created_at
              )
              ORDER BY pcp.ai_confidence DESC NULLS LAST
            )
            FROM core.ai_proposed_category_product pcp
            JOIN core.ai_proposed_category pc
              ON pc.proposed_category_id = pcp.proposed_category_id
            WHERE pcp.supplier_product_id = sp.supplier_product_id
              AND pcp.status = 'pending'
          ),
          '[]'::jsonb
        ) AS proposals
      FROM core.supplier_product sp
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      WHERE sp.ai_categorization_status IN ('pending_review', 'failed')
         OR (
           sp.category_id IS NULL
           AND EXISTS (
             SELECT 1
             FROM core.ai_proposed_category_product p
             WHERE p.supplier_product_id = sp.supplier_product_id
               AND p.status = 'pending'
           )
         )
      ORDER BY sp.updated_at DESC NULLS LAST
      LIMIT 100
    `)

    const conflicts = rows.map((row) => {
      const conflictType = !row.category_id
        ? "missing_category"
        : row.ai_categorization_status === "pending_review"
          ? "pending_review"
          : row.ai_categorization_status === "failed"
            ? "ai_failed"
            : "manual_review"

      const severity =
        conflictType === "missing_category"
          ? "high"
          : conflictType === "pending_review" || conflictType === "ai_failed"
            ? "medium"
            : "low"

      let message: string
      switch (conflictType) {
        case "missing_category":
          message = "Product has no active category assignment."
          break
        case "pending_review":
          message = "AI suggestions require review before assignment."
          break
        case "ai_failed":
          message = "AI categorization failed for this product. Manual intervention is required."
          break
        default:
          message = "Manual review requested for recent category changes."
      }

      const proposals: ConflictRow["proposals"] = Array.isArray(row.proposals)
        ? row.proposals.map((proposal) => ({
            proposed_category_id: proposal.proposed_category_id ?? null,
            category_id: proposal.category_id ?? null,
            category_name: proposal.category_name ?? null,
            confidence:
              proposal.confidence !== null && proposal.confidence !== undefined
                ? Number(proposal.confidence)
                : null,
            reasoning: proposal.reasoning ?? null,
            provider: proposal.provider ?? null,
            created_at: proposal.created_at ?? null,
          }))
        : []

      return {
        supplier_product_id: row.supplier_product_id,
        supplier_id: row.supplier_id,
        supplier_sku: row.supplier_sku,
        product_name: row.name_from_supplier,
        conflict_type: conflictType,
        severity,
        message,
        current_category_id: row.category_id,
        current_category_name: row.current_category_name,
        ai_confidence:
          row.ai_confidence !== null && row.ai_confidence !== undefined
            ? Number(row.ai_confidence)
            : null,
        ai_reasoning: row.ai_reasoning,
        ai_status: row.ai_categorization_status,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        first_seen_at: row.first_seen_at ? new Date(row.first_seen_at).toISOString() : null,
        suggestions: proposals,
      }
    })

    return NextResponse.json({ success: true, conflicts })
  } catch (error) {
    console.error("[API] Conflict listing error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve conflict queue",
      },
      { status: 500 },
    )
  }
}


