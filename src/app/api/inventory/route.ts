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

  const limit = Number.isFinite(limitParam) && limitParam > 0
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
        detail: "Use cursor-based pagination for large offsets (use 'cursor' param)",
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
        `(ii.sku > $${params.length - 2} OR (ii.sku = $${
          params.length - 1
        } AND ii.id > $${params.length}))`
      );
    }
  }

  // Supplier filter (most selective, goes early)
  if (supplierId) {
    params.push(supplierId);
    where.push(`ii.supplier_id = $${params.length}`);
  }

  // Category filter with validation (GIN index will be used)
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
      where.push(`ii.category = ANY($${params.length})`);
    }
  }

  // Search filter - use separate parameters for better index usage (trigram indexes)
  if (search) {
    params.push(`%${search}%`);
    const skuParam = params.length;
    params.push(`%${search}%`);
    const nameParam = params.length;
    where.push(`(ii.sku ILIKE $${skuParam} OR ii.name ILIKE $${nameParam})`);
  }

  // Stock status filter - uses partial indexes for optimized queries
  if (status) {
    // Map UI status to SQL predicates
    switch (status) {
      case "out_of_stock":
        // Uses partial index: idx_inventory_items_out_of_stock (WHERE stock_qty = 0)
        where.push(`ii.stock_qty = 0`);
        break;
      case "low_stock":
        // Uses partial index: idx_inventory_items_low_stock (WHERE stock_qty > 0 AND stock_qty <= reorder_point)
        where.push(
          `ii.stock_qty > 0 AND ii.stock_qty <= COALESCE(ii.reorder_point, 0)`
        );
        break;
      case "critical":
        where.push(
          `COALESCE(ii.reorder_point, 0) > 0 AND ii.stock_qty > 0 AND ii.stock_qty <= (ii.reorder_point / 2.0)`
        );
        break;
      case "in_stock":
        where.push(`ii.stock_qty > COALESCE(ii.reorder_point, 0)`);
        break;
      default:
        // ignore unknown
        break;
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Query hint for PostgreSQL
  const sql = `
    /* inventory_list_query */
    SELECT
      ii.id,
      ii.sku,
      ii.name,
      ii.category,
      ii.stock_qty,
      ii.reserved_qty,
      COALESCE(ii.available_qty, ii.stock_qty - COALESCE(ii.reserved_qty, 0)) AS available_qty,
      ii.cost_price,
      ii.sale_price,
      ii.supplier_id,
      ii.brand_id
    FROM inventory_items AS ii
    ${whereSql}
    ORDER BY ii.sku ASC, ii.id ASC
    ${cursor ? `LIMIT ${limit}` : `LIMIT ${limit} OFFSET ${offset}`}
  `;

  const queryStartTime = performance.now();

  try {
    const { rows } = await query(sql, params, { timeout: 10000, maxRetries: 0 });
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
    response.headers.set("X-Query-Fingerprint", `inventory_list_${search ? "search" : "filter"}`);
    response.headers.set("X-Effective-Limit", String(limit));
    if (!cursor) {
      response.headers.set("X-Pagination-Mode", offset > 0 ? "offset" : "offset-first-page");
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
