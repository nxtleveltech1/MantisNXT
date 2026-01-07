import { NextRequest, NextResponse } from "next/server";
import { 
  getListingById, 
  getListingWithImages, 
  updateListing, 
  deleteListing 
} from "@/lib/marketplace-app/db/listings";

// GET /api/marketplace-app/listings/[id] - Get a single listing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await getListingWithImages(id);

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error("Error fetching listing:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/marketplace-app/listings/[id] - Update a listing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingListing = await getListingById(id);
    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const updated = await updateListing(id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating listing:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/marketplace-app/listings/[id] - Delete a listing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingListing = await getListingById(id);
    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    await deleteListing(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting listing:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

