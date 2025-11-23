import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { listTags as listLegacyTags, addTag as addLegacyTag } from "@/lib/cmm/db-sql"
import {
  createCoreTag,
  listCoreTags,
  ensureCoreTagInfrastructure,
} from "@/lib/cmm/tag-service-core"

export async function GET() {
  try {
    const schemaMode = await getSchemaMode()

    if (schemaMode === "none") {
      return NextResponse.json({
        success: true,
        mode: "demo",
        tags: [
          { id: "tag-instruments", name: "Instruments", type: "custom", productCount: 18 },
          { id: "tag-acoustic", name: "Acoustic", type: "custom", productCount: 9 },
          { id: "tag-electric", name: "Electric", type: "custom", productCount: 7 },
          { id: "tag-piano", name: "Piano", type: "custom", productCount: 4 },
          { id: "tag-preorder", name: "Pre-order", type: "stock", productCount: 2 },
          { id: "tag-summer", name: "Summer", type: "seasonal", productCount: 5 },
        ],
      })
    }

    if (schemaMode === "core") {
      const tags = await listCoreTags()
      return NextResponse.json({
        success: true,
        mode: "core",
        tags: tags.map((tag) => ({
          id: tag.tag_id,
          name: tag.name,
          type: tag.type,
          productCount: tag.product_count,
        })),
      })
    }

    const legacyTags = await listLegacyTags()
    return NextResponse.json({
      success: true,
      mode: "legacy",
      tags: legacyTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        type: tag.type ?? "custom",
        productCount: 0,
      })),
    })
  } catch (error) {
    console.error("Tags fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load tags",
        tags: [],
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, type } = await request.json()

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Tag name is required",
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

    if (schemaMode === "core") {
      await ensureCoreTagInfrastructure()
      const tag = await createCoreTag(name, type)
      return NextResponse.json({
        success: true,
        tag: {
          id: tag.tag_id,
          name: tag.name,
          type: tag.type,
        },
      })
    }

    const tag = await addLegacyTag(name, type)
    return NextResponse.json({
      success: true,
      tag,
    })
  } catch (error) {
    console.error("Tag creation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create tag",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, type, description, color, icon, parent_tag_id, metadata, is_active } = await request.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Tag ID is required",
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

    if (schemaMode === "core") {
      await ensureCoreTagInfrastructure()
      const { updateCoreTag } = await import("@/lib/cmm/tag-service-core")
      const tag = await updateCoreTag(id, {
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const cascade = searchParams.get("cascade") === "true"

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Tag ID is required",
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

    if (schemaMode === "core") {
      await ensureCoreTagInfrastructure()
      const { deleteCoreTag } = await import("@/lib/cmm/tag-service-core")
      const result = await deleteCoreTag(id, cascade)
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

