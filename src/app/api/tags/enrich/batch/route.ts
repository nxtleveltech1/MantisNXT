import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { TagAIService } from "@/lib/cmm/tag-ai-service"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productIds, applyChanges = false, webResearchEnabled = true, batchSize, batchDelayMs } = body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Product IDs array is required",
        },
        { status: 400 },
      )
    }

    const schemaMode = await getSchemaMode()

    if (schemaMode === "none") {
      return NextResponse.json(
        {
          success: false,
          message: "Tag service unavailable (no schema detected).",
        },
        { status: 503 },
      )
    }

    if (schemaMode !== "core") {
      return NextResponse.json(
        {
          success: false,
          message: "Product enrichment only supported in core schema mode",
        },
        { status: 501 },
      )
    }

    const tagAIService = new TagAIService()
    const result = await tagAIService.enrichProductBatch(productIds, {
      applyChanges,
      webResearchEnabled,
      batchSize,
      batchDelayMs,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || "Failed to enrich products",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: Array.from(result.data?.entries() || []).map(([id, enrichment]) => ({
        supplier_product_id: id,
        ...enrichment,
      })),
      count: result.data?.size || 0,
      provider: result.provider,
      model: result.model,
    })
  } catch (error) {
    console.error("Batch product enrichment error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to enrich products"
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Log full error details for debugging
    console.error("Full error details:", { errorMessage, errorStack, error })
    
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 },
    )
  }
}

