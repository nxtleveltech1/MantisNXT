"use client";

import { useState, useMemo } from "react";
import { MarketplaceSidebar, type FilterState } from "@/components/marketplace-app/marketplace-sidebar";
import { ListingCard } from "@/components/marketplace-app/listing-card";

type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: string;
  sellerLocation?: string | null;
  createdAt?: string | null;
  images?: string[];
  category?: string;
};

type MarketplaceContentProps = {
  initialListings: Listing[];
  initialSearch?: string;
};

export function MarketplaceContent({ initialListings, initialSearch = "" }: MarketplaceContentProps) {
  const [listings] = useState(initialListings);
  const [filters, setFilters] = useState<FilterState>({
    category: "All",
    priceRange: [0, 100000],
    conditions: [],
    brands: [],
  });

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      // Only show active listings
      if (listing.status !== "LIVE") return false;

      // Filter by search query
      const matchesSearch =
        initialSearch === "" ||
        listing.title.toLowerCase().includes(initialSearch.toLowerCase()) ||
        listing.description.toLowerCase().includes(initialSearch.toLowerCase());

      // Filter by category
      const matchesCategory = filters.category === "All" || listing.category === filters.category;

      // Filter by price range (convert cents to Rands)
      const priceInRands = listing.priceCents / 100;
      const matchesPrice = priceInRands >= filters.priceRange[0] && priceInRands <= filters.priceRange[1];

      // Filter by condition
      const matchesCondition = filters.conditions.length === 0 || filters.conditions.includes(listing.category || "");

      // Filter by brand
      const matchesBrand =
        filters.brands.length === 0 ||
        filters.brands.some((brand) => listing.title.toLowerCase().includes(brand.toLowerCase()));

      return matchesSearch && matchesCategory && matchesPrice && matchesCondition && matchesBrand;
    });
  }, [listings, initialSearch, filters]);

  return (
    <div className="flex flex-1 w-full">
      {/* Sidebar */}
      <MarketplaceSidebar filters={filters} onFiltersChange={setFilters} totalResults={filteredListings.length} />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="container py-6 px-4">
          {/* Mobile Filters */}
          <div className="lg:hidden mb-4">
            <MarketplaceSidebar
              filters={filters}
              onFiltersChange={setFilters}
              totalResults={filteredListings.length}
            />
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Browse Audio Visual Equipment</h1>
            <p className="text-muted-foreground">Discover professional AV gear from trusted sellers</p>
          </div>

          {filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No equipment found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

