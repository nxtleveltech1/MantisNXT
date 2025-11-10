import { NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { query as dbQuery } from "@/lib/database/unified-connection"

export async function GET() {
  try {
    const schemaMode = await getSchemaMode()

    if (schemaMode === "none") {
      // Return mock stats for demo mode
      return NextResponse.json({
        categories: {
          total: 8,
          assigned: 6,
          unassigned: 2,
          visible: 6,
          hidden: 2,
          parents: 4,
          children: 4,
        },
        products: {
          total: 450,
          categorized: 380,
          uncategorized: 70,
        },
        topCategories: [
          { id: "cat-002", name: "Electric Guitars", productCount: 120, percentage: 85 },
          { id: "cat-005", name: "Keyboards", productCount: 95, percentage: 72 },
          { id: "cat-004", name: "Drums", productCount: 88, percentage: 68 },
          { id: "cat-003", name: "Acoustic Guitars", productCount: 77, percentage: 45 },
        ],
        recentCategories: [
          { id: "cat-005", name: "Keyboards", productCount: 95, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
          { id: "cat-004", name: "Drums", productCount: 88, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
          { id: "cat-003", name: "Acoustic Guitars", productCount: 77, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
          { id: "cat-002", name: "Electric Guitars", productCount: 120, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
        ],
        hasSchema: false,
      })
    }

    // Fetch live data from core schema
    if (schemaMode === "core") {
      // Get category statistics
      const categoryStats = await dbQuery<{
        total: number
        visible: number
        hidden: number
        parents: number
        children: number
      }>(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE is_active = true) AS visible,
          COUNT(*) FILTER (WHERE is_active = false) AS hidden,
          COUNT(*) FILTER (WHERE parent_id IS NULL) AS parents,
          COUNT(*) FILTER (WHERE parent_id IS NOT NULL) AS children
        FROM core.category
      `)

      // Get product statistics
      const productStats = await dbQuery<{
        total: number
        categorized: number
        uncategorized: number
      }>(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE category_id IS NOT NULL) AS categorized,
          COUNT(*) FILTER (WHERE category_id IS NULL) AS uncategorized
        FROM core.supplier_product
      `)

      // Get top categories by product count
      const topCategories = await dbQuery<{
        category_id: string
        name: string
        product_count: number
      }>(`
        SELECT
          c.category_id,
          c.name,
          COUNT(sp.product_id) AS product_count
        FROM core.category c
        LEFT JOIN core.supplier_product sp ON sp.category_id = c.category_id
        WHERE c.is_active = true
        GROUP BY c.category_id, c.name
        HAVING COUNT(sp.product_id) > 0
        ORDER BY product_count DESC
        LIMIT 5
      `)

      // Get recently created categories
      const recentCategories = await dbQuery<{
        category_id: string
        name: string
        product_count: number
        created_at: Date
      }>(`
        SELECT
          c.category_id,
          c.name,
          COUNT(sp.product_id) AS product_count,
          c.created_at
        FROM core.category c
        LEFT JOIN core.supplier_product sp ON sp.category_id = c.category_id
        GROUP BY c.category_id, c.name, c.created_at
        ORDER BY c.created_at DESC
        LIMIT 5
      `)

      const totalProducts = Number(productStats.rows[0]?.total || 0)
      const stats = categoryStats.rows[0] || {
        total: 0,
        visible: 0,
        hidden: 0,
        parents: 0,
        children: 0,
      }

      return NextResponse.json({
        categories: {
          total: Number(stats.total || 0),
          assigned: Number(productStats.rows[0]?.categorized || 0),
          unassigned: Number(productStats.rows[0]?.uncategorized || 0),
          visible: Number(stats.visible || 0),
          hidden: Number(stats.hidden || 0),
          parents: Number(stats.parents || 0),
          children: Number(stats.children || 0),
        },
        products: {
          total: totalProducts,
          categorized: Number(productStats.rows[0]?.categorized || 0),
          uncategorized: Number(productStats.rows[0]?.uncategorized || 0),
        },
        topCategories: topCategories.rows.map((row) => ({
          id: row.category_id,
          name: row.name,
          productCount: Number(row.product_count || 0),
          percentage: totalProducts > 0 ? Math.round((Number(row.product_count || 0) / totalProducts) * 100) : 0,
        })),
        recentCategories: recentCategories.rows.map((row) => ({
          id: row.category_id,
          name: row.name,
          productCount: Number(row.product_count || 0),
          createdAt: row.created_at,
        })),
        hasSchema: true,
      })
    }

    // Legacy schema fallback
    const legacyStats = await dbQuery<{
      total: number
      visible: number
      parents: number
    }>(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active = true) AS visible,
        COUNT(*) FILTER (WHERE parent_id IS NULL) AS parents
      FROM categories
    `)

    const stats = legacyStats.rows[0] || { total: 0, visible: 0, parents: 0 }
    const total = Number(stats.total || 0)
    const visible = Number(stats.visible || 0)
    const parents = Number(stats.parents || 0)

    return NextResponse.json({
      categories: {
        total,
        assigned: 0,
        unassigned: 0,
        visible,
        hidden: total - visible,
        parents,
        children: total - parents,
      },
      products: {
        total: 0,
        categorized: 0,
        uncategorized: 0,
      },
      topCategories: [],
      recentCategories: [],
      hasSchema: true,
    })
  } catch (error) {
    console.error("Dashboard stats fetch error:", error)
    return NextResponse.json(
      {
        categories: {
          total: 0,
          assigned: 0,
          unassigned: 0,
          visible: 0,
          hidden: 0,
          parents: 0,
          children: 0,
        },
        products: {
          total: 0,
          categorized: 0,
          uncategorized: 0,
        },
        topCategories: [],
        recentCategories: [],
        hasSchema: false,
      },
      { status: 500 },
    )
  }
}