import { query } from "@/lib/database/unified-connection"

export type CmmSchemaMode = "core" | "legacy" | "none"

const SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000

let cachedSchemaMode: { mode: CmmSchemaMode; expiresAt: number } | null = null

async function probeSchema(): Promise<CmmSchemaMode> {
  try {
    const { rows } = await query<{
      has_core_supplier_product: boolean
      has_core_category: boolean
      has_core_ai_job: boolean
      has_legacy_products: boolean
      has_legacy_categories: boolean
      has_legacy_tags: boolean
    }>(`
      SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'core'
            AND table_name = 'supplier_product'
        ) AS has_core_supplier_product,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'core'
            AND table_name = 'category'
        ) AS has_core_category,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'core'
            AND table_name = 'ai_categorization_job'
        ) AS has_core_ai_job,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'products'
        ) AS has_legacy_products,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'categories'
        ) AS has_legacy_categories,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'tags'
        ) AS has_legacy_tags
    `)

    const row = rows[0]

    if (row?.has_core_supplier_product && row?.has_core_category && row?.has_core_ai_job) {
      return "core"
    }

    if (row?.has_legacy_products && row?.has_legacy_categories && row?.has_legacy_tags) {
      return "legacy"
    }

    return "none"
  } catch (error) {
    console.error("Failed to probe schema mode:", error)
    return "none"
  }
}

export async function getSchemaMode(): Promise<CmmSchemaMode> {
  const now = Date.now()

  if (cachedSchemaMode && cachedSchemaMode.expiresAt > now) {
    return cachedSchemaMode.mode
  }

  const mode = await probeSchema()
  cachedSchemaMode = {
    mode,
    expiresAt: now + SCHEMA_CACHE_TTL_MS,
  }

  return mode
}

export async function checkDatabaseSchema(): Promise<boolean> {
  const mode = await getSchemaMode()
  return mode !== "none"
}

export async function getMockProducts() {
  return [
    {
      sku: "YMH-001",
      supplierId: "yamaha",
      categoryId: "cat-001",
      description: "Yamaha FG830 Acoustic Guitar",
      price: 199.99,
      stockType: "stock" as const,
      imageUrl: "/acoustic-guitar.png",
      tags: ["tag-instruments", "tag-acoustic"],
      attributes: { brand: "Yamaha", model: "FG830", type: "Acoustic" },
      updatedAt: Date.now(),
    },
    {
      sku: "YMH-002",
      supplierId: "yamaha",
      categoryId: "cat-001",
      description: "Yamaha P-45 Digital Piano",
      price: 449.99,
      stockType: "stock" as const,
      imageUrl: "/digital-piano.jpg",
      tags: ["tag-instruments", "tag-piano"],
      attributes: { brand: "Yamaha", model: "P-45", type: "Digital Piano" },
      updatedAt: Date.now(),
    },
    {
      sku: "FND-001",
      supplierId: "fender",
      categoryId: "cat-002",
      description: "Fender Player Stratocaster Electric Guitar",
      price: 799.99,
      stockType: "stock" as const,
      imageUrl: "/electric-guitar.jpg",
      tags: ["tag-instruments", "tag-electric"],
      attributes: { brand: "Fender", model: "Player Stratocaster", type: "Electric Guitar" },
      updatedAt: Date.now(),
    },
    {
      sku: "GIB-001",
      supplierId: "gibson",
      categoryId: "cat-002",
      description: "Gibson Les Paul Standard Electric Guitar",
      price: 2499.99,
      stockType: "preorder" as const,
      imageUrl: "/les-paul-guitar.jpg",
      tags: ["tag-instruments", "tag-electric", "tag-preorder"],
      attributes: { brand: "Gibson", model: "Les Paul Standard", type: "Electric Guitar" },
      updatedAt: Date.now(),
    },
    {
      sku: "DRM-001",
      supplierId: "pearl",
      categoryId: "cat-003",
      description: "Pearl Export 5-Piece Drum Set",
      price: 699.99,
      stockType: "stock" as const,
      imageUrl: "/acoustic-drum-set.png",
      tags: ["tag-instruments", "tag-drums"],
      attributes: { brand: "Pearl", model: "Export", pieces: 5 },
      updatedAt: Date.now(),
    },
  ]
}

export async function getMockUploads() {
  return [
    {
      id: "upl-001",
      supplierId: "yamaha",
      source: "file",
      filename: "yamaha_2024_q1.xlsx",
      inserted: 45,
      updated: 12,
      conflicts: 3,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "upl-002",
      supplierId: "fender",
      source: "text",
      filename: null,
      inserted: 23,
      updated: 8,
      conflicts: 1,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "upl-003",
      supplierId: "gibson",
      source: "file",
      filename: "gibson_catalog_2024.csv",
      inserted: 67,
      updated: 15,
      conflicts: 7,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

