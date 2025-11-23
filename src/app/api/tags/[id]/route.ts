import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { getCoreTag, updateCoreTag, deleteCoreTag } from "@/lib/cmm/tag-service-core"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    if (schemaMode === "core") {
      const tag = await getCoreTag(params.id)
      if (!tag) {
        return NextResponse.json(
          {
            success: false,
            message: "Tag not found",
          },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        tag: {
          id: tag.tag_id,
          name: tag.name,
          type: tag.type,
          description: tag.description,
          color: tag.color,
          icon: tag.icon,
          parent_tag_id: tag.parent_tag_id,
          metadata: tag.metadata,
          is_active: tag.is_active,
          created_at: tag.created_at,
          updated_at: tag.updated_at,
          product_count: tag.product_count,
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: "Legacy mode not supported for single tag retrieval",
      },
      { status: 501 },
    )
  } catch (error) {
    console.error("Tag fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch tag",
      },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, type, description, color, icon, parent_tag_id, metadata, is_active } = body

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

    if (schemaMode === "core") {
      const tag = await updateCoreTag(params.id, {
        name,
        type,
        description,
        color,
        icon,
        parent_tag_id,
        metadata,
        is_active,
      })
      return NextResponse.json({
        success: true,
        tag: {
          id: tag.tag_id,
          name: tag.name,
          type: tag.type,
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: "Update not supported in legacy mode",
      },
      { status: 501 },
    )
  } catch (error) {
    console.error("Tag update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update tag",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const cascade = searchParams.get("cascade") === "true"

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

    if (schemaMode === "core") {
      const result = await deleteCoreTag(params.id, cascade)
      return NextResponse.json({
        success: true,
        message: `Tag deleted${result.assignmentsRemoved > 0 ? ` (${result.assignmentsRemoved} assignments removed)` : ""}`,
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: "Delete not supported in legacy mode",
      },
      { status: 501 },
    )
  } catch (error) {
    console.error("Tag deletion error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete tag",
      },
      { status: 500 },
    )
  }
}

