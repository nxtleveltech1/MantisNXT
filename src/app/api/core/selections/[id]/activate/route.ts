import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { inventorySelectionService } from "@/lib/services/InventorySelectionService";

/**
 * POST /api/core/selections/[id]/activate
 * Activate an inventory selection with conflict handling
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: selectionId } = await context.params;

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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const deactivateOthers = body.deactivate_others ?? false;

    // Activate selection
    const activatedSelection =
      await inventorySelectionService.activateSelection(
        selectionId,
        deactivateOthers
      );

    return NextResponse.json({
      success: true,
      data: activatedSelection,
      message: "Selection activated successfully",
    });
  } catch (error) {
    console.error("Error activating selection:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      // Check for conflict error (another selection is active)
      if (
        error.message.includes("active") ||
        error.message.includes("conflict")
      ) {
        // Fetch current active selection for detailed conflict response
        try {
          const active = await inventorySelectionService.getActiveSelection();
          return NextResponse.json(
            {
              success: false,
              error: "Another selection is already active",
              conflict: active
                ? {
                    active_selection_id: active.selection_id,
                    active_selection_name: active.selection_name,
                  }
                : { message: error.message },
            },
            { status: 409 }
          );
        } catch (_) {
          return NextResponse.json(
            {
              success: false,
              error: "Another selection is already active",
              conflict: { message: error.message },
            },
            { status: 409 }
          );
        }
      }

      // Check for validation errors
      if (
        error.message.includes("not found") ||
        error.message.includes("invalid")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Selection not found or invalid",
            details: error.message,
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to activate selection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
