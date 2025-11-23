import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { bulkAssignTags, bulkRemoveTags } from "@/lib/cmm/tag-service-core"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productIds, tagIds, action = "assign", assignedBy } = body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Product IDs array is required",
        },
        { status: 400 },
      )
    }

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tag IDs array is required",
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
          message: "Batch operations only supported in core schema mode",
        },
        { status: 501 },
      )
    }

    if (action === "assign") {
      const result = await bulkAssignTags(productIds, tagIds, { assignedBy: assignedBy || "api" })
      return NextResponse.json({
        success: true,
        message: `Assigned ${result.assigned} tag(s)`,
        assigned: result.assigned,
      })
    } else if (action === "remove") {
      const result = await bulkRemoveTags(productIds, tagIds)
      return NextResponse.json({
        success: true,
        message: `Removed ${result.removed} tag assignment(s)`,
        removed: result.removed,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Action must be 'assign' or 'remove'",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Batch tag assignment error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to batch assign tags",
      },
      { status: 500 },
    )
  }
}

