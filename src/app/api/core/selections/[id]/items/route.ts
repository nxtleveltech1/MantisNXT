import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { inventorySelectionService } from "@/lib/services/InventorySelectionService";

/**
 * GET /api/core/selections/[id]/items
 * Get items in a specific inventory selection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: selectionId } = await params;

    // Validate selection ID format
    if (!selectionId || typeof selectionId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid selection ID",
        },
        { status: 400 }
      );
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplier_id");
    const search = searchParams.get("search");

    // Build filters object
    const filters: unknown = {};
    if (status) filters.status = status;
    if (supplierId) filters.supplier_id = supplierId;
    if (search) filters.search = search;

    // Get selection items
    const items = await inventorySelectionService.getSelectionItems(
      selectionId,
      filters
    );

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching selection items:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("invalid")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Selection not found",
            details: error.message,
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch selection items",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
