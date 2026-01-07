"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, ImageOff } from "lucide-react";
import { formatPrice } from "@/lib/marketplace-app/formatters";

type ListingCardProps = {
  listing: {
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
};

/**
 * Validates if a string is a valid image URL (absolute http/https URL)
 */
function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ListingCard({ listing }: ListingCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Recently";
    const now = new Date();
    const created = new Date(date);
    const diffInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const rawImageUrl = listing.images?.[0];
  // Only treat as valid if it's an absolute URL (not a bare filename)
  const imageUrl = useMemo(() => isValidImageUrl(rawImageUrl) ? rawImageUrl : null, [rawImageUrl]);
  const hasValidImage = imageUrl && !imageError;

  const formatLocation = (location: string | null | undefined) => {
    if (!location) return "South Africa";
    let formatted = location;
    formatted = formatted.replace(/,\s*(NY|CA|TX),?\s*/gi, "");
    formatted = formatted.replace(/(New York|Los Angeles|San Francisco|Austin),?\s*/gi, "");
    formatted = formatted.trim().replace(/^,\s*|\s*,$/g, "");
    if (!formatted.includes("South Africa")) {
      formatted = formatted ? `${formatted}, South Africa` : "South Africa";
    }
    return formatted;
  };

  return (
    <Link href={`/marketplace-app/listings/${listing.id}`} className="group">
      <Card className="overflow-hidden h-full border border-border/50 bg-card hover:border-primary/30 hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
        {/* Image Container */}
        <div className="aspect-[4/3] relative bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {hasValidImage ? (
            <>
              {/* Loading skeleton */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                  <Package className="size-12 text-muted-foreground/30" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={listing.title}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
              <ImageOff className="size-10" />
              <span className="text-xs font-medium">No image</span>
            </div>
          )}
          
          {/* Sold overlay */}
          {listing.status === "sold" && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
              <Badge variant="secondary" className="text-base px-5 py-2 font-bold">
                SOLD
              </Badge>
            </div>
          )}

          {/* Category badge */}
          {listing.category && (
            <Badge 
              variant="secondary" 
              className="absolute top-3 left-3 text-xs bg-background/90 backdrop-blur-sm shadow-sm"
            >
              {listing.category}
            </Badge>
          )}
        </div>

        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
          <div>
            <span className="text-xl font-bold text-primary">{formatPrice(listing.priceCents)}</span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
          {listing.sellerLocation && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{formatLocation(listing.sellerLocation)}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground/70 shrink-0">{formatDate(listing.createdAt)}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}