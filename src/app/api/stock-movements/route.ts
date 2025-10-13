import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool, withTransaction } from "@/lib/database";

const CreateStockMovementSchema = z.object({
  supplierProductId: z
    .string()
    .uuid("Valid supplier product ID is required"),
  locationId: z.string().uuid("Valid location ID is required").optional(),
  movementType: z.enum([
    "RECEIPT",
    "ISSUE",
    "TRANSFER",
    "ADJUSTMENT",
    "RETURN",
  ]),
  quantity: z.number().positive("Quantity must be positive"),
  referenceDoc: z.string().optional(),
  notes: z.string().optional(),
  performedBy: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierProductId = searchParams.get("supplierProductId");
    const locationId = searchParams.get("locationId");
    const movementType = searchParams.get("movementType");
    const limit = Math.min(
      100,
      parseInt(searchParams.get("limit") || "50", 10)
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    console.log(
      `🔍 Fetching stock movements: supplierProductId=${supplierProductId}, locationId=${locationId}, type=${movementType}`
    );

    // Query using correct table: core.stock_movement (singular, not plural)
    // Note: Cast supplier_product_id to match type in supplier_product table
    const sql = `
      SELECT
        sm.movement_id as id,
        sm.supplier_product_id,
        sp.supplier_sku as sku,
        sp.name_from_supplier as item_name,
        sm.movement_type,
        sm.qty as quantity,
        sm.reference_doc as reference,
        sm.notes,
        sm.location_id,
        sm.movement_ts as timestamp,
        sm.created_by,
        sm.created_at
      FROM core.stock_movement sm
      LEFT JOIN core.supplier_product sp ON sp.supplier_product_id::text = sm.supplier_product_id::text
      ORDER BY sm.movement_ts DESC
      LIMIT $1 OFFSET $2
    `;

    const { rows } = await pool.query(sql, [limit, offset]);

    const data = rows.map((r: any) => ({
      id: r.id,
      supplierProductId: r.supplier_product_id,
      sku: r.sku,
      itemName: r.item_name,
      movementType: r.movement_type,
      quantity: parseFloat(r.quantity || 0),
      reference: r.reference,
      notes: r.notes,
      locationId: r.location_id,
      locationName: r.location_name || "N/A",
      timestamp: r.timestamp?.toISOString() || new Date().toISOString(),
      createdBy: r.created_by,
      createdAt: r.created_at?.toISOString() || new Date().toISOString(),
    }));

    console.log(`✅ Found ${data.length} stock movements`);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        limit,
        offset,
        total: data.length,
        hasMore: data.length === limit,
      },
    });
  } catch (e: any) {
    console.error("❌ Stock movements query failed:", e);
    return NextResponse.json(
      {
        success: false,
        error: "STOCK_MOVEMENTS_LIST_FAILED",
        detail: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateStockMovementSchema.parse(body);

    console.log(
      `📦 Creating stock movement: ${validated.movementType} for product ${validated.supplierProductId}`
    );

    const mv = await withTransaction(async (client) => {
      // Using correct table: core.stock_movement (singular)
      const ins = await client.query(
        `INSERT INTO core.stock_movement (
           location_id, supplier_product_id, movement_type, qty,
           reference_doc, notes, movement_ts, created_by
         ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, NOW(), $7)
         RETURNING movement_id as id, movement_ts as timestamp`,
        [
          validated.locationId || null,
          validated.supplierProductId,
          validated.movementType,
          validated.quantity,
          validated.referenceDoc || null,
          validated.notes || null,
          validated.performedBy || "system",
        ]
      );

      console.log(`✅ Stock movement created: ID ${ins.rows[0].id}`);
      return ins.rows[0];
    });

    // Cache invalidation removed - not needed for now

    return NextResponse.json(
      {
        success: true,
        data: {
          id: mv.id,
          timestamp: mv.timestamp?.toISOString() || new Date().toISOString(),
        },
        message: "Stock movement recorded successfully",
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("❌ Stock movement creation failed:", e);

    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_FAILED",
          details: e.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`
          ),
        },
        { status: 400 }
      );
    }

    const status = e?.message === "INSUFFICIENT_AVAILABLE" ? 400 : 500;
    return NextResponse.json(
      {
        success: false,
        error: "STOCK_MOVEMENTS_CREATE_FAILED",
        detail: e?.message ?? String(e),
      },
      { status }
    );
  }
}
