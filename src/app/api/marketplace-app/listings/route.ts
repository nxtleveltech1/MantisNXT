import { NextRequest, NextResponse } from "next/server";
import { getPublicListings, createListing, getListingImages } from "@/lib/marketplace-app/db/listings";

// GET /api/marketplace-app/listings - Fetch public listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const listings = await getPublicListings({
      status: ["LIVE"],
      search,
      limit,
      offset,
    });

    // Fetch images for each listing
    const listingsWithImages = await Promise.all(
      listings.map(async (listing) => {
        const images = await getListingImages(listing.id);
        return {
          ...listing,
          images: images.map((img) => img.imageUrl),
        };
      })
    );

    return NextResponse.json(listingsWithImages);
  } catch (error: any) {
    console.error("Error fetching listings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/marketplace-app/listings - Create a new listing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sellerId, title, description, priceCents, sellerLocation } = body;

    if (!sellerId || !title || !description || !priceCents) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const listing = await createListing({
      sellerId,
      title,
      description,
      priceCents,
      sellerLocation,
      status: "SUBMITTED",
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error: any) {
    console.error("Error creating listing:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

