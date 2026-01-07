"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceHeader } from "@/components/marketplace-app/marketplace-header";
import { MarketplaceContent } from "@/components/marketplace-app/marketplace-content";
import { getPublicListings, getListingImages } from "@/lib/marketplace-app/db/listings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store } from "lucide-react";
import { useRouter } from "next/navigation";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const router = useRouter();
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
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title="Marketplace" subtitle="Browse and manage marketplace listings" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.push("/portal")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
            <Button variant="outline" onClick={() => router.push("/marketplace-app/listings/new")}>
              <Store className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <MarketplaceHeader searchQuery={params?.search || ""} />
            <div className="flex-1 flex overflow-hidden">
              <MarketplaceContent initialListings={listingsForClient} initialSearch={params?.search || ""} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

