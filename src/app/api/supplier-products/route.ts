import { NextRequest, NextResponse } from "next/server";
import { query as dbQuery } from "@/lib/database";
import { z } from "zod";

// Zod validation schemas for type safety and security
const SupplierProductsQuerySchema = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  page_size: z.number().int().min(1).max(500).default(50),
  sort_by: z
    .enum(["name", "sku", "supplier", "stock", "price"])
    .default("name"),
  sort_direction: z.enum(["asc", "desc"]).default("asc"),
  selection_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  search: z.string().min(1).max(200).optional(),
});

type SupplierProductsQuery = z.infer<typeof SupplierProductsQuerySchema>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and parse query parameters
    const queryParams = SupplierProductsQuerySchema.parse({
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      page_size: searchParams.get("page_size")
        ? parseInt(searchParams.get("page_size")!)
        : 50,
      sort_by: searchParams.get("sort_by") || "name",
      sort_direction: searchParams.get("sort_direction") || "asc",
      selection_id: searchParams.get("selection_id") || undefined,
      supplier_id: searchParams.get("supplier_id") || undefined,
      search: searchParams.get("search") || undefined,
    });

    const {
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_direction: sortDirection,
      selection_id: selectionId,
      supplier_id: supplierId,
      search,
    } = queryParams;

    const offset = (page - 1) * pageSize;

    // Build WHERE conditions with parameterized queries
    const whereConditions: string[] = ["1=1"];
    const sqlParams: any[] = [];
    let paramIndex = 1;

    if (selectionId) {
      whereConditions.push(
        `sp.supplier_product_id IN (SELECT supplier_product_id FROM core.inventory_selected_item WHERE selection_id = $${paramIndex++})`
      );
      sqlParams.push(selectionId);
    }

    if (supplierId) {
      whereConditions.push(`sp.supplier_id = $${paramIndex++}`);
      sqlParams.push(supplierId);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      whereConditions.push(
        `(sp.supplier_sku ILIKE $${paramIndex} OR sp.name_from_supplier ILIKE $${paramIndex} OR COALESCE(p.name, '') ILIKE $${paramIndex})`
      );
      sqlParams.push(searchPattern);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Add sorting with validated fields
    const validSortFields: Record<string, string> = {
      name: "sp.name_from_supplier",
      sku: "sp.supplier_sku",
      supplier: "s.name",
      stock: "soh.qty",
      price: "soh.unit_cost",
    };

    const sortField = validSortFields[sortBy] || "sp.name_from_supplier";
    const direction = sortDirection.toUpperCase() === "DESC" ? "DESC" : "ASC";

    // Execute main query with proper parameterization
    const query = `
      SELECT
        sp.supplier_product_id as id,
        sp.supplier_id,
        sp.supplier_sku as sku,
        sp.name_from_supplier as name,
        sp.uom,
        sp.pack_size,
        sp.barcode,
        sp.is_active,
        sp.is_new,
        sp.category_id,
        sp.attrs_json as attributes,
        s.name as supplier_name,
        s.code as supplier_code,
        COALESCE(p.name, sp.name_from_supplier) as product_name,
        soh.qty as stock_qty,
        soh.unit_cost
      FROM core.supplier_product sp
      LEFT JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
      WHERE ${whereClause}
      ORDER BY ${sortField} ${direction}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    sqlParams.push(pageSize, offset);
    const result = await dbQuery(query, sqlParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM core.supplier_product sp
      WHERE ${whereClause}
    `;
    const countResult = await dbQuery<{ total: string }>(
      countQuery,
      sqlParams.slice(0, -2)
    );
    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      success: true,
      data: {
        data: result.rows,
        pagination: {
          page,
          page_size: pageSize,
          total_count: total,
          total_pages: Math.ceil(total / pageSize),
          has_next: offset + pageSize < total,
          has_previous: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching supplier products:", error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch supplier products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
