/**
 * GET /api/serve/nxt-soh - Authoritative Stock on Hand for selected items only
 *
 * This is the SINGLE SOURCE OF TRUTH for operational stock queries.
 * Returns ONLY items in the active inventory selection.
 * If no active selection exists, returns empty array.
 *
 * All downstream modules (inventory, purchase orders, invoices, reporting)
 * should use this endpoint instead of querying stock directly.
 *
 * Query Parameters:
 * - supplier_ids: string[] - Filter by supplier IDs (comma-separated)
 * - location_ids: string[] - Filter by location IDs (comma-separated)
 * - search: string - Search by product name or SKU
 * - limit: number - Page size (default: 1000)
 * - offset: number - Page offset (default: 0)
 */

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { stockService } from "@/lib/services/StockService";
import { inventorySelectionService } from "@/lib/services/InventorySelectionService";
import {
  createErrorResponse,
  validateQueryParams,
} from "@/lib/utils/neon-error-handler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and parse query parameters
    const validation = validateQueryParams(searchParams, {
      limit: "number",
      offset: "number",
      search: "string",
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Parse array parameters manually
    const supplier_ids =
      searchParams.get("supplier_ids")?.split(",").filter(Boolean) || undefined;
    const location_ids =
      searchParams.get("location_ids")?.split(",").filter(Boolean) || undefined;

    // Step 1: Verify an active selection exists
    const activeSelection =
      await inventorySelectionService.getActiveSelection();

    if (!activeSelection) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          message:
            "No active selection. Please activate an inventory selection first.",
          active_selection: null,
          pagination: {
            total: 0,
            limit: validation.parsed.limit || 1000,
            offset: validation.parsed.offset || 0,
            has_more: false,
          },
        },
        {
          headers: {
            "Cache-Control": "private, max-age=60",
          },
        }
      );
    }

    // Step 2: Query NXT SOH (selected items only)
    const nxtSoh = await stockService.getNxtSoh({
      supplier_ids,
      location_ids,
      search: validation.parsed.search,
      limit: validation.parsed.limit || 1000,
      offset: validation.parsed.offset || 0,
    });

    // Step 3: Get total count for pagination (optimized)
    const total = await stockService.getNxtSohCount({
      supplier_ids,
      location_ids,
      search: validation.parsed.search,
    });

    // Step 4: Generate ETag based on selection and timestamp
    const etag = `"${activeSelection.selection_id}-${activeSelection.updated_at}"`;

    return NextResponse.json(
      {
        success: true,
        data: nxtSoh,
        active_selection: {
          selection_id: activeSelection.selection_id,
          selection_name: activeSelection.selection_name,
        },
        pagination: {
          total,
          limit: validation.parsed.limit || 1000,
          offset: validation.parsed.offset || 0,
          has_more: (validation.parsed.offset || 0) + nxtSoh.length < total,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          // Cache for 1 minute - balance between freshness and performance
          "Cache-Control": "private, max-age=60",
          ETag: etag,
        },
      }
    );
  } catch (error) {
    console.error("[API] NXT SOH error:", error);
    return createErrorResponse(error, 500);
  }
}
