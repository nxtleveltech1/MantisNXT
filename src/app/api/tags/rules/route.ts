import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { listRules as listLegacyRules, addRuleKeyword as addLegacyRule } from "@/lib/cmm/db-sql"
import {
  createCoreTagRule,
  ensureCoreTagInfrastructure,
  listCoreTagRules,
} from "@/lib/cmm/tag-service-core"

export async function GET() {
  try {
    const schemaMode = await getSchemaMode()

    if (schemaMode === "none") {
      return NextResponse.json({
        success: true,
        mode: "demo",
        rules: [
          { id: "rule-demo-1", kind: "keyword", keyword: "guitar", tagId: "tag-instruments", tagName: "Instruments" },
          { id: "rule-demo-2", kind: "keyword", keyword: "piano", tagId: "tag-piano", tagName: "Piano" },
          { id: "rule-demo-3", kind: "keyword", keyword: "drum", tagId: "tag-drums", tagName: "Drums" },
        ],
      })
    }

    if (schemaMode === "core") {
      const rules = await listCoreTagRules()
      return NextResponse.json({
        success: true,
        mode: "core",
        rules,
      })
    }

    const rules = await listLegacyRules()
    return NextResponse.json({
      success: true,
      mode: "legacy",
      rules,
    })
  } catch (error) {
    console.error("Rules fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load rules",
        rules: [],
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { keyword, tagId } = await request.json()

    if (!keyword || !tagId) {
      return NextResponse.json(
        {
          success: false,
          message: "Keyword and tagId are required",
        },
        { status: 400 },
      )
    }

    const schemaMode = await getSchemaMode()

    if (schemaMode === "none") {
      return NextResponse.json(
        {
          success: false,
          message: "Tag rule service unavailable (no schema detected).",
        },
        { status: 503 },
      )
    }

    if (schemaMode === "core") {
      await ensureCoreTagInfrastructure()
      await createCoreTagRule(keyword, tagId)
      return NextResponse.json({
        success: true,
        message: "Rule created successfully",
      })
    }

    const rule = await addLegacyRule(keyword, tagId)
    return NextResponse.json({
      success: true,
      rule,
    })
  } catch (error) {
    console.error("Rule creation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create rule",
      },
      { status: 500 },
    )
  }
}

