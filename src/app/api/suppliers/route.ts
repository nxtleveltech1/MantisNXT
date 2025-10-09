import { NextRequest, NextResponse } from "next/server";
import { query, pool } from "@/lib/database/unified-connection";
import { z } from "zod";
import { CacheInvalidator } from "@/lib/cache/invalidation";
import { performance } from "perf_hooks";

const SLOW_QUERY_THRESHOLD_MS = 1000;

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  website: z.string().url().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  primary_category: z.string().optional(),
  geographic_region: z.string().optional(),
  preferred_supplier: z.boolean().default(false),
  bee_level: z.string().optional(),
  local_content_percentage: z.number().min(0).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const search = searchParams.get("search");
    const status = searchParams.get("status")?.split(",");
    const performanceTier = searchParams.get("performance_tier")?.split(",");
    const category = searchParams.get("category")?.split(",");
    const region = searchParams.get("region")?.split(",");
    const beeLevel = searchParams.get("bee_level")?.split(",");
    const preferredOnly = searchParams.get("preferred_only") === "true";
    const minSpend = searchParams.get("min_spend");
    const maxSpend = searchParams.get("max_spend");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const cursor = searchParams.get("cursor");

    // Request validation
    if (limit > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Limit too large",
          detail: "Maximum limit is 1000",
        },
        { status: 400 }
      );
    }

    if (page > 10000) {
      return NextResponse.json(
        {
          success: false,
          error: "Page number too large",
          detail: "Use cursor-based pagination for large offsets",
        },
        { status: 400 }
      );
    }

    if (search && search.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Search term too short",
          detail: "Search term must be at least 2 characters",
        },
        { status: 400 }
      );
    }

    // Build the query - using core.supplier table
    let sqlQuery = `
      /* suppliers_list_query */
      SELECT supplier_id as id, name, active as status, contact_email as email,
             contact_phone as phone, payment_terms_days, default_currency as currency,
             website, created_at, updated_at,
             '' as address, '' as contact_person, '' as tax_id, '' as payment_terms,
             '' as primary_category, '' as geographic_region, '' as bee_level,
             0 as local_content_percentage, false as preferred_supplier,
             '' as performance_tier, 0 as spend_last_12_months
      FROM core.supplier
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add status filter first for partial index usage
    if (status?.length) {
      sqlQuery += ` AND status = ANY($${paramIndex})`;
      queryParams.push(status);
      paramIndex++;
    }

    // Add cursor-based pagination
    if (cursor) {
      sqlQuery += ` AND id > $${paramIndex}`;
      queryParams.push(cursor);
      paramIndex++;
    }

    // Add search filter - trigram index on name will be used for primary search
    if (search) {
      sqlQuery += ` AND (
        name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        contact_person ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add performance tier filter
    if (performanceTier?.length) {
      sqlQuery += ` AND performance_tier = ANY($${paramIndex})`;
      queryParams.push(performanceTier);
      paramIndex++;
    }

    // Add category filter
    if (category?.length) {
      sqlQuery += ` AND primary_category = ANY($${paramIndex})`;
      queryParams.push(category);
      paramIndex++;
    }

    // Add region filter
    if (region?.length) {
      sqlQuery += ` AND geographic_region = ANY($${paramIndex})`;
      queryParams.push(region);
      paramIndex++;
    }

    // Add BEE level filter
    if (beeLevel?.length) {
      sqlQuery += ` AND bee_level = ANY($${paramIndex})`;
      queryParams.push(beeLevel);
      paramIndex++;
    }

    // Add preferred supplier filter
    if (preferredOnly) {
      sqlQuery += ` AND preferred_supplier = true`;
    }

    // Add spend filters
    if (minSpend) {
      sqlQuery += ` AND spend_last_12_months >= $${paramIndex}`;
      queryParams.push(parseFloat(minSpend));
      paramIndex++;
    }

    if (maxSpend) {
      sqlQuery += ` AND spend_last_12_months <= $${paramIndex}`;
      queryParams.push(parseFloat(maxSpend));
      paramIndex++;
    }

    // Add ordering and pagination
    if (cursor) {
      sqlQuery += ` ORDER BY id ASC LIMIT $${paramIndex}`;
      queryParams.push(limit);
    } else {
      sqlQuery += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${
        paramIndex + 1
      }`;
      queryParams.push(limit, offset);
    }

    // Execute query with performance tracking
    const queryStartTime = performance.now();
    const result = await query(sqlQuery, queryParams);
    const queryDuration = performance.now() - queryStartTime;

    // Log slow queries
    if (queryDuration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`🐌 SLOW SUPPLIERS QUERY: ${queryDuration.toFixed(2)}ms`, {
        search,
        status,
        performanceTier,
        category,
        region,
        beeLevel,
        preferredOnly,
        minSpend,
        maxSpend,
        page,
        limit,
        cursor,
        rowCount: result.rows.length,
      });
    }

    // Get total count for pagination - using core.supplier
    let countQuery = `
      SELECT COUNT(*) as total
      FROM core.supplier
      WHERE 1=1
    `;

    // Apply same filters to count query (excluding pagination)
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (
        name ILIKE $${countParamIndex} OR
        email ILIKE $${countParamIndex} OR
        contact_person ILIKE $${countParamIndex} OR
        primary_category ILIKE $${countParamIndex}
      )`;
      countParamIndex++;
    }

    if (status?.length) {
      countQuery += ` AND status = ANY($${countParamIndex})`;
      countParamIndex++;
    }

    if (performanceTier?.length) {
      countQuery += ` AND performance_tier = ANY($${countParamIndex})`;
      countParamIndex++;
    }

    if (category?.length) {
      countQuery += ` AND primary_category = ANY($${countParamIndex})`;
      countParamIndex++;
    }

    if (region?.length) {
      countQuery += ` AND geographic_region = ANY($${countParamIndex})`;
      countParamIndex++;
    }

    if (beeLevel?.length) {
      countQuery += ` AND bee_level = ANY($${countParamIndex})`;
      countParamIndex++;
    }

    if (preferredOnly) {
      countQuery += ` AND preferred_supplier = true`;
    }

    if (minSpend) {
      countQuery += ` AND spend_last_12_months >= $${countParamIndex}`;
      countParamIndex++;
    }

    if (maxSpend) {
      countQuery += ` AND spend_last_12_months <= $${countParamIndex}`;
      countParamIndex++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Generate next cursor for cursor-based pagination
    let nextCursor = null;
    if (cursor && result.rows.length > 0) {
      const lastRow = result.rows[result.rows.length - 1];
      nextCursor = lastRow.id;
    }

    const response = NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextCursor,
      },
    });

    // Add performance headers
    response.headers.set("X-Query-Duration-Ms", queryDuration.toFixed(2));
    response.headers.set("X-Query-Fingerprint", "suppliers_list");

    return response;
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = supplierSchema.parse(body);

    // Check for duplicate supplier name - using core.supplier
    const existingSupplier = await pool.query(
      "SELECT supplier_id as id FROM core.supplier WHERE name = $1",
      [validatedData.name]
    );

    if (existingSupplier.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Supplier with this name already exists" },
        { status: 409 }
      );
    }

    // Insert supplier - using core.supplier table
    const insertQuery = `
      INSERT INTO core.supplier (
        name, contact_email, contact_phone, website, active, default_currency, payment_terms_days
      ) VALUES (
        $1, $2, $3, $4, true, 'USD', 30
      ) RETURNING supplier_id as id, *
    `;

    const insertResult = await pool.query(insertQuery, [
      validatedData.name,
      validatedData.email,
      validatedData.phone,
      validatedData.website,
    ]);

    // Invalidate cache after successful creation
    CacheInvalidator.invalidateSupplier(
      insertResult.rows[0].id,
      validatedData.name
    );

    return NextResponse.json({
      success: true,
      data: insertResult.rows[0],
      message: "Supplier created successfully",
    });
  } catch (error) {
    console.error("Error creating supplier:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create supplier",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
