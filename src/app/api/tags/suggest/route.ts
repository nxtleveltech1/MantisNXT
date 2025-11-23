import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { TagAIService } from "@/lib/cmm/tag-ai-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productIds, webResearchEnabled = false } = body

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
          message: "AI tag suggestions only supported in core schema mode",
        },
        { status: 501 },
      )
    }

    const tagAIService = new TagAIService()
    const result = await tagAIService.suggestTagsBatch(productIds, {
      webResearchEnabled,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || "Failed to suggest tags",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: Array.from(result.data?.entries() || []).map(([id, tags]) => ({
        supplier_product_id: id,
        suggested_tags: tags,
      })),
      count: result.data?.size || 0,
      provider: result.provider,
      model: result.model,
    })
  } catch (error) {
    console.error("Tag suggestion error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to suggest tags",
      },
      { status: 500 },
    )
  }
}

