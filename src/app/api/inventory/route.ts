import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/api-auth";
import { InventoryService, createErrorResponse } from "@/lib/services/UnifiedDataService";

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url = req.nextUrl;

    // Extract and validate query parameters
    const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
    const pageParam = parseInt(url.searchParams.get("page") || "", 10);
    const cursor = url.searchParams.get("cursor")?.trim() || undefined;
    const search = url.searchParams.get("search")?.trim() || undefined;
    const category = url.searchParams.get("category")?.trim() || undefined;
    const supplierId = url.searchParams.get("supplierId")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim() || undefined;

    // Enforce conservative server-side limits
    const MAX_LIMIT = 1000;
    const DEFAULT_LIMIT = 250;
    const MAX_OFFSET = 100000;

    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const offset = (page - 1) * Math.max(limit, 1);

    // Request validation
    if (limit > MAX_LIMIT) {
      const errorResponse = createErrorResponse(
        "Limit too large",
        `Maximum limit is ${MAX_LIMIT}`
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!cursor && offset > MAX_OFFSET) {
      const errorResponse = createErrorResponse(
        "Offset too large",
        "Use cursor-based pagination for large offsets (use 'cursor' param)"
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (search && search.length < 2) {
      const errorResponse = createErrorResponse(
        "Search term too short",
        "Search term must be at least 2 characters"
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Category validation
    if (category) {
      const cats = category.split(",").map((s) => s.trim()).filter(Boolean);
      if (cats.length > 50) {
        const errorResponse = createErrorResponse(
          "Too many categories",
          "Maximum 50 categories allowed"
        );
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    // Use unified service
    const result = await InventoryService.getInventory({
      page,
      limit,
      cursor,
      search,
      filters: {
        category: category?.split(",").filter(Boolean),
        supplierId,
        status,
      },
    });

    // Return error if service failed
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // Create response with performance headers
    const response = NextResponse.json(result);

    if (result.meta?.queryTime) {
      response.headers.set("X-Query-Duration-Ms", result.meta.queryTime.toFixed(2));
    }
    if (result.meta?.queryFingerprint) {
      response.headers.set("X-Query-Fingerprint", result.meta.queryFingerprint);
    }
    response.headers.set("X-Effective-Limit", String(limit));
    response.headers.set("X-Pagination-Mode", cursor ? "cursor" : "offset");
    if (result.pagination?.cursor) {
      response.headers.set("X-Next-Cursor", result.pagination.cursor);
    }

    return response;
  } catch (err: any) {
    console.error("Error fetching inventory:", err);
    const errorResponse = createErrorResponse(
      "INVENTORY_QUERY_FAILED",
      err?.message ?? String(err)
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
});
