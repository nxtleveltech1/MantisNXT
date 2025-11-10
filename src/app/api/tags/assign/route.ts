import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { assignTag as assignLegacyTag } from "@/lib/cmm/db-sql"
import {
  assignCoreTag,
  createCoreTag,
  ensureCoreTagInfrastructure,
  listCoreTags,
} from "@/lib/cmm/tag-service-core"

export async function POST(request: Request) {
  try {
    const { sku, supplierProductId, tagId, tagName } = await request.json()

    if (!tagId && !tagName) {
      return NextResponse.json(
        {
          success: false,
          message: "A tag identifier or name is required.",
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
      if (!supplierProductId) {
        return NextResponse.json(
          {
            success: false,
            message: "supplierProductId is required when using the core schema.",
          },
          { status: 400 },
        )
      }

      await ensureCoreTagInfrastructure()
      let finalTagId = tagId as string | undefined

      if (!finalTagId && tagName) {
        const createdTag = await createCoreTag(tagName, "custom")
        finalTagId = createdTag.tag_id
      }

      if (!finalTagId) {
        const available = await listCoreTags()
        if (available.length === 0) {
          return NextResponse.json(
            {
              success: false,
              message: "No tags available to assign. Create a tag first.",
            },
            { status: 400 },
          )
        }
        finalTagId = available[0].tag_id
      }

      await assignCoreTag(supplierProductId, finalTagId, { assignedBy: "manual" })

      return NextResponse.json({
        success: true,
        message: "Tag assigned successfully",
      })
    }

    if (!sku || !tagId) {
      return NextResponse.json(
        {
          success: false,
          message: "SKU and tagId are required",
        },
        { status: 400 },
      )
    }

    await assignLegacyTag(sku, tagId)

    return NextResponse.json({
      success: true,
      message: "Tag assigned successfully",
    })
  } catch (error) {
    console.error("Tag assign error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to assign tag",
      },
      { status: 500 },
    )
  }
}

