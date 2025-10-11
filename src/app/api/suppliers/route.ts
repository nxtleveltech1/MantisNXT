import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/api-auth";
import { query, pool } from "@/lib/database/unified-connection";
import { z } from "zod";
import { CacheInvalidator } from "@/lib/cache/invalidation";
import { performance } from "perf_hooks";

const SLOW_QUERY_THRESHOLD_MS = 1000;

// Simple schema for basic supplier creation
const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  primary_category: z.string().optional(),
  geographic_region: z.string().optional(),
  preferred_supplier: z.boolean().default(false),
  bee_level: z.string().optional(),
  local_content_percentage: z.number().min(0).max(100).optional(),
});

// Enhanced schema for complex supplier form data
const enhancedSupplierSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  legalName: z.string().optional(),
  website: z.string().optional().or(z.literal("")),
  industry: z.string().optional(),
  tier: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  primaryContact: z
    .object({
      name: z.string().optional(),
      title: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
    })
    .optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  foundedYear: z.number().optional(),
  employeeCount: z.number().optional(),
  annualRevenue: z.number().optional(),
  currency: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  products: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  leadTime: z.number().optional(),
  minimumOrderValue: z.number().optional(),
  paymentTerms: z.string().optional(),
});

export const GET = withAuth(async (request: NextRequest) => {
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
    const limitParam = parseInt(searchParams.get("limit") || "50");
    const limit = Math.min(Math.max(1, limitParam), 1000);
    const offset = (page - 1) * limit;
    const cursor = searchParams.get("cursor");

    // Request validation
    // limit is clamped to [1,1000] above

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

    // Build the query - using core.supplier table with ONLY existing columns
    let sqlQuery = `
      /* suppliers_list_query */
      SELECT
        supplier_id as id,
        name,
        code,
        CASE WHEN active = true THEN 'active' ELSE 'inactive' END as status,
        contact_info,
        contact_info->>'email' as email,
        contact_info->>'phone' as phone,
        contact_info->>'website' as website,
        payment_terms,
        default_currency as currency,
        tax_number,
        created_at,
        updated_at
      FROM core.supplier
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add status filter first for partial index usage
    if (status?.length) {
      // Map string values to boolean: 'active' -> true, 'inactive' -> false
      const statusBooleans = status.map((s) => s.toLowerCase() === "active");

      // If all values are the same, use simple equality instead of ANY
      const allTrue = statusBooleans.every((b) => b === true);
      const allFalse = statusBooleans.every((b) => b === false);

      if (allTrue) {
        sqlQuery += ` AND active = true`;
      } else if (allFalse) {
        sqlQuery += ` AND active = false`;
      } else {
        sqlQuery += ` AND active = ANY($${paramIndex})`;
        queryParams.push(statusBooleans);
        paramIndex++;
      }
    }

    // Removed incorrect cursor-based pagination on UUIDs

    // Add search filter - only search on existing columns
    if (search) {
      sqlQuery += ` AND (
        name ILIKE $${paramIndex} OR
        code ILIKE $${paramIndex} OR
        contact_info->>'email' ILIKE $${paramIndex} OR
        contact_info->>'phone' ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // REMOVED: Non-existent column filters
    // - performanceTier (column doesn't exist)
    // - category (column doesn't exist)
    // - region (column doesn't exist)
    // - beeLevel (column doesn't exist)
    // - preferredOnly (column doesn't exist)
    // - minSpend/maxSpend (column doesn't exist)

    // Cursor-based pagination (name, id) for stable ordering
    let usingCursor = false;
    let cursorName: string | null = null;
    let cursorId: string | null = null;
    if (cursor) {
      const parts = cursor.split("|");
      if (parts.length === 2) {
        cursorName = parts[0];
        cursorId = parts[1];
        // Apply keyset condition
        sqlQuery += ` AND (name > $${paramIndex} OR (name = $${paramIndex} AND supplier_id > $${paramIndex + 1}::uuid))`;
        queryParams.push(cursorName, cursorId);
        paramIndex += 2;
        usingCursor = true;
      }
    }

    // Add ordering and pagination
    if (usingCursor) {
      sqlQuery += ` ORDER BY name ASC, supplier_id ASC LIMIT $${paramIndex}`;
      queryParams.push(limit);
    } else {
      sqlQuery += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
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

    // Get total count for pagination - using core.supplier with ONLY existing columns
    let countQuery = `
      SELECT COUNT(*) as total
      FROM core.supplier
      WHERE 1=1
    `;

    // Apply same filters to count query (excluding pagination)
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status?.length) {
      // Map string values to boolean: 'active' -> true, 'inactive' -> false
      const statusBooleans = status.map((s) => s.toLowerCase() === "active");

      // If all values are the same, use simple equality instead of ANY
      const allTrue = statusBooleans.every((b) => b === true);
      const allFalse = statusBooleans.every((b) => b === false);

      if (allTrue) {
        countQuery += ` AND active = true`;
      } else if (allFalse) {
        countQuery += ` AND active = false`;
      } else {
        countQuery += ` AND active = ANY($${countParamIndex})`;
        countParams.push(statusBooleans);
        countParamIndex++;
      }
    }

    if (search) {
      countQuery += ` AND (
        name ILIKE $${countParamIndex} OR
        code ILIKE $${countParamIndex} OR
        contact_info->>'email' ILIKE $${countParamIndex} OR
        contact_info->>'phone' ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    // REMOVED: All filters on non-existent columns

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Generate next cursor for cursor-based pagination
    let nextCursor: string | null = null;
    if (result.rows.length === limit && result.rows.length > 0) {
      const lastRow = result.rows[result.rows.length - 1];
      nextCursor = `${lastRow.name}|${lastRow.id}`;
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
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Try enhanced schema first (from EnhancedSupplierForm), fall back to simple schema
    let validatedData: any;
    let isEnhanced = false;

    try {
      validatedData = enhancedSupplierSchema.parse(body);
      isEnhanced = true;
    } catch {
      validatedData = supplierSchema.parse(body);
    }

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

    // Build contact_info JSONB based on schema type
    let contactInfo: any = {};

    if (isEnhanced) {
      // Enhanced form data
      contactInfo = {
        email: validatedData.primaryContact?.email || "",
        phone: validatedData.primaryContact?.phone || "",
        website: validatedData.website || "",
        contact_person: validatedData.primaryContact?.name || "",
        job_title: validatedData.primaryContact?.title || "",
        department: validatedData.primaryContact?.department || "",
        address: validatedData.address
          ? {
              street: validatedData.address.street,
              city: validatedData.address.city,
              state: validatedData.address.state,
              postalCode: validatedData.address.postalCode,
              country: validatedData.address.country,
            }
          : null,
      };
    } else {
      // Simple form data
      contactInfo = {
        email: validatedData.email || "",
        phone: validatedData.phone || "",
        website: validatedData.website || "",
        address: validatedData.address,
        contact_person: validatedData.contact_person || "",
      };
    }

    // Generate code if not provided
    const code =
      isEnhanced && validatedData.code
        ? validatedData.code
        : validatedData.name
            .substring(0, 10)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

    const insertQuery = `
      INSERT INTO core.supplier (
        name,
        code,
        contact_info,
        active,
        default_currency,
        payment_terms,
        tax_number,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3::jsonb, true, $4, $5, $6, NOW(), NOW()
      ) RETURNING supplier_id as id, *
    `;

    const insertResult = await pool.query(insertQuery, [
      validatedData.name,
      code,
      JSON.stringify(contactInfo),
      isEnhanced ? validatedData.currency || "USD" : "USD",
      validatedData.paymentTerms || validatedData.payment_terms || "30 days",
      isEnhanced
        ? validatedData.taxId || validatedData.registrationNumber
        : validatedData.tax_id,
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
});
