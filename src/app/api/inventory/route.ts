import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database/unified-connection";
import { toDisplay } from "@/lib/utils/transformers/inventory";
import { performance } from "perf_hooks";

type Format = "display" | "raw";

const SLOW_QUERY_THRESHOLD_MS = 1000;

function parseFormat(req: NextRequest): Format {
  const f = (req.nextUrl.searchParams.get("format") || "display").toLowerCase();
  return f === "raw" ? "raw" : "display";
}

export async function GET(req: NextRequest) {
  const format = parseFormat(req);

  const url = req.nextUrl;
  const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
  const pageParam = parseInt(url.searchParams.get("page") || "", 10);

  // Enforce conservative server-side limits to prevent expensive scans/timeouts
  const MAX_LIMIT = 1000; // hard cap per-request
  const DEFAULT_LIMIT = 250; // safer default
  const MAX_OFFSET = 100000; // encourage cursor-based pagination beyond this

  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * Math.max(limit, 1);
  const cursor = url.searchParams.get("cursor")?.trim() || "";

  // Request validation
  if (limit > MAX_LIMIT) {
    return NextResponse.json(
      { error: "Limit too large", detail: `Maximum limit is ${MAX_LIMIT}` },
      { status: 400 }
    );
  }

  if (!cursor && offset > MAX_OFFSET) {
    return NextResponse.json(
      {
        error: "Offset too large",
        detail:
          "Use cursor-based pagination for large offsets (use 'cursor' param)",
      },
      { status: 400 }
    );
  }

  const search = url.searchParams.get("search")?.trim() || "";
  const category = url.searchParams.get("category")?.trim() || "";
  const supplierId = url.searchParams.get("supplierId")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";

  // Validate search term length
  if (search && search.length < 2) {
    return NextResponse.json(
      {
        error: "Search term too short",
        detail: "Search term must be at least 2 characters",
      },
      { status: 400 }
    );
  }

  const where: string[] = [];
  const params: any[] = [];

  // Cursor-based pagination
  if (cursor) {
    const [lastSku, lastId] = cursor.split("|");
    if (lastSku && lastId) {
      params.push(lastSku, lastSku, lastId);
      where.push(
        `(sp.supplier_sku > $${params.length - 2} OR (sp.supplier_sku = $${
          params.length - 1
        } AND soh.soh_id > CAST($${params.length} AS uuid)))`
      );
    }
  }

  // Supplier filter (most selective, goes early)
  if (supplierId) {
    params.push(supplierId);
    where.push(`sp.supplier_id = CAST($${params.length} AS uuid)`);
  }

  // Category filter with validation
  if (category) {
    const cats = category
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cats.length > 50) {
      return NextResponse.json(
        {
          error: "Too many categories",
          detail: "Maximum 50 categories allowed",
        },
        { status: 400 }
      );
    }
    if (cats.length > 0) {
      params.push(cats);
      where.push(
        `COALESCE(p.category_id, sp.category_id) = ANY($${params.length}::uuid[])`
      );
    }
  }

  // Search filter
  if (search) {
    params.push(`%${search}%`);
    const skuParam = params.length;
    params.push(`%${search}%`);
    const nameParam = params.length;
    where.push(
      `(sp.supplier_sku ILIKE $${skuParam} OR COALESCE(p.name, sp.name_from_supplier) ILIKE $${nameParam})`
    );
  }

  // Stock status filter
  if (status) {
    // Map UI status to SQL predicates
    switch (status) {
      case "out_of_stock":
        where.push(`soh.qty = 0`);
        break;
      case "low_stock":
        where.push(`soh.qty > 0 AND soh.qty <= 10`);
        break;
      case "critical":
        where.push(`soh.qty > 0 AND soh.qty <= 5`);
        break;
      case "in_stock":
        where.push(`soh.qty > 10`);
        break;
      default:
        // ignore unknown
        break;
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Query hint for PostgreSQL - using core schema tables
  const sql = `
    /* inventory_list_query */
    SELECT
      soh.soh_id as id,
      sp.supplier_sku as sku,
      COALESCE(p.name, sp.name_from_supplier) as name,
      COALESCE(p.category_id, sp.category_id) as category,
      soh.qty as stock_qty,
      0 as reserved_qty,
      soh.qty as available_qty,
      soh.unit_cost as cost_price,
      soh.unit_cost as sale_price,
      sp.supplier_id,
      p.brand_id
    FROM core.stock_on_hand AS soh
    JOIN core.supplier_product AS sp ON sp.supplier_product_id = soh.supplier_product_id
    LEFT JOIN core.product AS p ON p.product_id = sp.product_id
    ${whereSql}
    ORDER BY sp.supplier_sku ASC, soh.soh_id ASC
    ${cursor ? `LIMIT ${limit}` : `LIMIT ${limit} OFFSET ${offset}`}
  `;

  const queryStartTime = performance.now();

  try {
    const { rows } = await query(sql, params, {
      timeout: 10000,
      maxRetries: 0,
    });
    const queryDuration = performance.now() - queryStartTime;

    // Log slow queries
    if (queryDuration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`🐌 SLOW INVENTORY QUERY: ${queryDuration.toFixed(2)}ms`, {
        search,
        category,
        supplierId,
        status,
        limit,
        offset,
        cursor,
        rowCount: rows.length,
      });
    }

    // Generate next cursor for cursor-based pagination
    let nextCursor = null;
    if (cursor && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      nextCursor = `${lastRow.sku}|${lastRow.id}`;
    }

    const responseData = format === "raw" ? rows : rows.map(toDisplay);
    const response = NextResponse.json(
      nextCursor ? { items: responseData, nextCursor } : responseData,
      { status: 200 }
    );

    // Add performance and pagination headers
    response.headers.set("X-Query-Duration-Ms", queryDuration.toFixed(2));
    response.headers.set(
      "X-Query-Fingerprint",
      `inventory_list_${search ? "search" : "filter"}`
    );
    response.headers.set("X-Effective-Limit", String(limit));
    if (!cursor) {
      response.headers.set(
        "X-Pagination-Mode",
        offset > 0 ? "offset" : "offset-first-page"
      );
    } else {
      response.headers.set("X-Pagination-Mode", "cursor");
      if (nextCursor) response.headers.set("X-Next-Cursor", nextCursor);
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: "INVENTORY_QUERY_FAILED", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
