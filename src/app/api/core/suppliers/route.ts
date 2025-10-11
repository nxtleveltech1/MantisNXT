import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database/neon-connection";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    let query = `
      SELECT 
        supplier_id as id,
        name,
        code,
        active,
        contact_info,
        default_currency as currency,
        payment_terms,
        created_at,
        updated_at
      FROM core.supplier
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (activeOnly) {
      conditions.push("active = $1");
      params.push(true);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY name ASC";

    const result = await pool.query(query, params);

    // Transform data for frontend
    const suppliers = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      active: row.active,
      email: row.contact_info?.email || "",
      phone: row.contact_info?.phone || "",
      website: row.contact_info?.website || "",
      currency: row.currency,
      paymentTerms: row.payment_terms,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch suppliers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

