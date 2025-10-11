import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool, withTransaction } from "@/lib/database";
import { serializeTimestamp } from "@/lib/utils/date-utils";
import { CacheInvalidator } from "@/lib/cache/invalidation";

const CreateStockMovementSchema = z.object({
  supplierProductId: z
    .number()
    .positive("Valid supplier product ID is required"),
  locationId: z.number().positive("Valid location ID is required"),
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

    const where: string[] = [];
    const params: any[] = [];

    if (supplierProductId) {
      where.push(`sm.supplier_product_id = $${params.length + 1}`);
      params.push(supplierProductId);
    }

    if (locationId) {
      where.push(`sm.location_id = $${params.length + 1}`);
      params.push(locationId);
    }

    if (movementType) {
      where.push(`sm.movement_type = $${params.length + 1}`);
      params.push(movementType.toUpperCase());
    }

    // Query using correct table: core.stock_movement (singular, not plural)
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
        sl.name as location_name,
        sm.movement_ts as timestamp,
        sm.created_by,
        sm.created_at
      FROM core.stock_movement sm
      JOIN core.supplier_product sp ON sp.supplier_product_id = sm.supplier_product_id
      LEFT JOIN core.stock_location sl ON sl.location_id = sm.location_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY sm.movement_ts DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const { rows } = await pool.query(sql, params);

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
      locationName: r.location_name,
      timestamp: serializeTimestamp(r.timestamp),
      createdBy: r.created_by,
      createdAt: serializeTimestamp(r.created_at),
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
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
         RETURNING movement_id as id, movement_ts as timestamp`,
        [
          validated.locationId,
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

    CacheInvalidator.invalidateStockMovements(
      validated.supplierProductId.toString()
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: mv.id,
          timestamp: serializeTimestamp(mv.timestamp),
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
