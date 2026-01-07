import { notFound } from "next/navigation";
import { getListingWithImages } from "@/lib/marketplace-app/db/listings";
import { MarketplaceHeader } from "@/components/marketplace-app/marketplace-header";
import { ListingDetail } from "@/components/marketplace-app/listing-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;

  let listing = null;
  try {
    listing = await getListingWithImages(id);
  } catch (error) {
    console.error("Error fetching listing:", error);
  }

  if (!listing) {
    notFound();
  }

  // Transform images for the client component
  const listingForClient = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    priceCents: listing.priceCents,
    status: listing.status,
    sellerId: listing.sellerId,
    sellerLocation: listing.sellerLocation,
    createdAt: listing.createdAt ? listing.createdAt.toISOString() : null,
    updatedAt: listing.updatedAt ? listing.updatedAt.toISOString() : null,
    images: listing.images
      .map((img) => img.imageUrl)
      .filter((url): url is string => {
        // Only include valid absolute URLs
        if (!url) return false;
        try {
          const parsed = new URL(url);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />
      <main className="flex-1 container py-8">
        <ListingDetail listing={listingForClient} />
      </main>
    </div>
  );
}

