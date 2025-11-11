import { type NextRequest, NextResponse } from "next/server"
import { getSchemaMode } from "@/lib/cmm/db"
import { query as legacyQuery } from "@/lib/database"
import { query as dbQuery } from "@/lib/database/unified-connection"
import { ensureCoreTagInfrastructure, listCoreTags } from "@/lib/cmm/tag-service-core"

const DEMO_RESPONSE = {
  isDemoMode: true,
  tagAnalytics: [
    {
      tagId: "tag-instruments",
      tagName: "Instruments",
      totalSales: 1250,
      totalTurnover: 125000,
      totalMargin: 31250,
      productCount: 45,
      avgPrice: 899.99,
    },
    {
      tagId: "tag-acoustic",
      tagName: "Acoustic",
      totalSales: 680,
      totalTurnover: 68000,
      totalMargin: 17000,
      productCount: 23,
      avgPrice: 599.99,
    },
    {
      tagId: "tag-electric",
      tagName: "Electric",
      totalSales: 420,
      totalTurnover: 84000,
      totalMargin: 21000,
      productCount: 15,
      avgPrice: 1299.99,
    },
  ],
  seasonalityData: [
    { month: "Jan", sales: 120, turnover: 12000, margin: 3000 },
    { month: "Feb", sales: 98, turnover: 9800, margin: 2450 },
    { month: "Mar", sales: 145, turnover: 14500, margin: 3625 },
    { month: "Apr", sales: 167, turnover: 16700, margin: 4175 },
    { month: "May", sales: 189, turnover: 18900, margin: 4725 },
    { month: "Jun", sales: 234, turnover: 23400, margin: 5850 },
  ],
  categoryData: [
    { name: "Guitars", value: 45, color: "#0088FE" },
    { name: "Pianos", value: 25, color: "#00C49F" },
    { name: "Drums", value: 20, color: "#FFBB28" },
    { name: "Accessories", value: 10, color: "#FF8042" },
  ],
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const selectedTag = searchParams.get("tag") || "all"
    const schemaMode = await getSchemaMode()

    if (schemaMode === "none") {
      return NextResponse.json(DEMO_RESPONSE)
    }

    if (schemaMode === "core") {
      await ensureCoreTagInfrastructure()
      const tags = await listCoreTags()

      const tagFilterClause = selectedTag === "all" ? "" : "WHERE a.tag_id = $1"
      const tagFilterParams = selectedTag === "all" ? [] : [selectedTag]

      const valueStats = await dbQuery<{
        tag_id: string
        product_count: number
        avg_price: number | null
        total_value: number | null
      }>(
        `
          WITH latest_price AS (
            SELECT DISTINCT ON (ph.supplier_product_id)
              ph.supplier_product_id,
              ph.price
            FROM core.price_history ph
            WHERE ph.is_current = true
            ORDER BY ph.supplier_product_id, ph.valid_from DESC
          )
          SELECT
            a.tag_id,
            COUNT(*)::int AS product_count,
            AVG(lp.price)::numeric AS avg_price,
            SUM(lp.price)::numeric AS total_value
          FROM core.ai_tag_assignment a
          LEFT JOIN latest_price lp ON lp.supplier_product_id = a.supplier_product_id
          ${tagFilterClause}
          GROUP BY a.tag_id
        `,
        tagFilterParams,
      )

      const seasonality = await dbQuery<{
        month: string
        assignments: number
      }>(
        `
          SELECT
            TO_CHAR(date_trunc('month', a.assigned_at), 'Mon') AS month,
            COUNT(*)::int AS assignments
          FROM core.ai_tag_assignment a
          ${tagFilterClause}
          GROUP BY date_trunc('month', a.assigned_at)
          ORDER BY date_trunc('month', a.assigned_at)
        `,
        tagFilterParams,
      )

      const categoryBreakdown = await dbQuery<{
        name: string
        total: number
      }>(
        `
          SELECT
            c.name,
            COUNT(*)::int AS total
          FROM core.supplier_product sp
          JOIN core.category c ON c.category_id = sp.category_id
          WHERE EXISTS (
            SELECT 1
            FROM core.ai_tag_assignment a
            WHERE a.supplier_product_id = sp.supplier_product_id
            ${selectedTag === "all" ? "" : "AND a.tag_id = $1"}
          )
          GROUP BY c.name
          ORDER BY total DESC
          LIMIT 6
        `,
        tagFilterParams,
      )

      const statsByTag = new Map<string, { avg_price: number; total_value: number; product_count: number }>()
      for (const row of valueStats.rows) {
        statsByTag.set(row.tag_id, {
          avg_price: Number(row.avg_price ?? 0),
          total_value: Number(row.total_value ?? 0),
          product_count: Number(row.product_count ?? 0),
        })
      }

      const tagAnalytics = (selectedTag === "all" ? tags : tags.filter((tag) => tag.tag_id === selectedTag)).map(
        (tag) => {
          const stats = statsByTag.get(tag.tag_id) ?? { avg_price: 0, total_value: 0, product_count: tag.product_count }
          return {
            tagId: tag.tag_id,
            tagName: tag.name,
            productCount: stats.product_count ?? tag.product_count,
            totalSales: 0,
            totalTurnover: stats.total_value,
            totalMargin: 0,
            avgPrice: stats.avg_price,
          }
        },
      )

      const transformedSeasonality = seasonality.rows.map((row) => ({
        month: row.month,
        sales: Number(row.assignments),
        turnover: Number(row.assignments),
        margin: 0,
      }))

      const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]
      const transformedCategoryData = categoryBreakdown.rows.map((row, index) => ({
        name: row.name,
        value: Number(row.total),
        color: colors[index % colors.length],
      }))

      return NextResponse.json({
        isDemoMode: false,
        mode: "core",
        tagAnalytics,
        seasonalityData: transformedSeasonality,
        categoryData: transformedCategoryData,
      })
    }

    // Legacy analytics leveraging historic tables
    const tagAnalyticsQuery =
      selectedTag === "all"
        ? `
            SELECT 
              t.id as tag_id,
              t.name as tag_name,
              COUNT(DISTINCT p.sku) as product_count,
              COALESCE(SUM(s.sales), 0) as total_sales,
              COALESCE(SUM(s.turnover), 0) as total_turnover,
              COALESCE(SUM(s.margin), 0) as total_margin,
              COALESCE(AVG(p.price), 0) as avg_price
            FROM tags t
            LEFT JOIN tag_assignments pt ON t.id = pt.tag_id
            LEFT JOIN products p ON pt.sku = p.sku
            LEFT JOIN sales_analytics s ON p.sku = s.sku
            GROUP BY t.id, t.name
            ORDER BY total_turnover DESC
          `
        : `
            SELECT 
              t.id as tag_id,
              t.name as tag_name,
              COUNT(DISTINCT p.sku) as product_count,
              COALESCE(SUM(s.sales), 0) as total_sales,
              COALESCE(SUM(s.turnover), 0) as total_turnover,
              COALESCE(SUM(s.margin), 0) as total_margin,
              COALESCE(AVG(p.price), 0) as avg_price
            FROM tags t
            LEFT JOIN tag_assignments pt ON t.id = pt.tag_id
            LEFT JOIN products p ON pt.sku = p.sku
            LEFT JOIN sales_analytics s ON p.sku = s.sku
            WHERE t.id = $1
            GROUP BY t.id, t.name
          `

    const seasonalityQuery =
      selectedTag === "all"
        ? `
            SELECT 
              month,
              SUM(sales) as sales,
              SUM(turnover) as turnover,
              SUM(margin) as margin
            FROM sales_analytics
            GROUP BY month
            ORDER BY 
              CASE month
                WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3
                WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
                WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9
                WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
              END
          `
        : `
            SELECT 
              s.month,
              SUM(s.sales) as sales,
              SUM(s.turnover) as turnover,
              SUM(s.margin) as margin
            FROM sales_analytics s
            JOIN products p ON s.sku = p.sku
            JOIN tag_assignments pt ON p.sku = pt.sku
            WHERE pt.tag_id = $1
            GROUP BY s.month
            ORDER BY 
              CASE s.month
                WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3
                WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
                WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9
                WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
              END
          `

    const categoryQuery = `
        SELECT 
          c.name,
          SUM(s.margin) as value
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        LEFT JOIN sales_analytics s ON p.sku = s.sku
        GROUP BY c.id, c.name
        HAVING SUM(s.margin) > 0
        ORDER BY value DESC
      `

    const [tagAnalyticsResult, seasonalityResult, categoryResult] = await Promise.all([
      legacyQuery(tagAnalyticsQuery, selectedTag === "all" ? [] : [selectedTag]),
      legacyQuery(seasonalityQuery, selectedTag === "all" ? [] : [selectedTag]),
      legacyQuery(categoryQuery),
    ])

    const transformedTagAnalytics = tagAnalyticsResult.rows.map((row: unknown) => ({
      tagId: row.tag_id,
      tagName: row.tag_name,
      totalSales: Number(row.total_sales),
      totalTurnover: Number(row.total_turnover),
      totalMargin: Number(row.total_margin),
      productCount: Number(row.product_count),
      avgPrice: Number(row.avg_price),
    }))

    const transformedSeasonalityData = seasonalityResult.rows.map((row: unknown) => ({
      month: row.month,
      sales: Number(row.sales),
      turnover: Number(row.turnover),
      margin: Number(row.margin),
    }))

    const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]
    const transformedCategoryData = categoryResult.rows.map((row: unknown, index: number) => ({
      name: row.name,
      value: Number(row.value),
      color: colors[index % colors.length],
    }))

    return NextResponse.json({
      isDemoMode: false,
      mode: "legacy",
      tagAnalytics: transformedTagAnalytics,
      seasonalityData: transformedSeasonalityData,
      categoryData: transformedCategoryData,
    })
  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json(DEMO_RESPONSE, { status: 200 })
  }
}



