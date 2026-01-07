import { MarketplaceHeader } from "@/components/marketplace-app/marketplace-header";
import { MarketplaceContent } from "@/components/marketplace-app/marketplace-content";
import { getPublicListings, getListingImages } from "@/lib/marketplace-app/db/listings";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const params = await searchParams;
  
  let listings: any[] = [];
  let listingsWithImages: any[] = [];
  
  try {
    listings = await getPublicListings({
      status: ["LIVE"],
      search: params?.search,
      limit: 100,
    });

    // Fetch images for each listing
    listingsWithImages = await Promise.all(
      listings.map(async (listing) => {
        const images = await getListingImages(listing.id);
        return {
          ...listing,
          images: images.map((img) => img.imageUrl),
        };
      })
    );
  } catch (error) {
    // Database not configured yet - show empty state
    console.error("Marketplace database not configured:", error);
  }

  // Convert Date objects to strings for the client component
  const listingsForClient = listingsWithImages.map((listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    priceCents: listing.priceCents,
    status: listing.status,
    sellerLocation: listing.sellerLocation,
    createdAt: listing.createdAt ? listing.createdAt.toISOString() : null,
    images: listing.images || [],
    category: undefined,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <MarketplaceHeader searchQuery={params?.search || ""} />
      <div className="flex-1 flex overflow-hidden">
        <MarketplaceContent initialListings={listingsForClient} initialSearch={params?.search || ""} />
      </div>
    </div>
  );
}

