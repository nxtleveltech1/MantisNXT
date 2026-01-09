"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  MessageCircle,
  Heart,
  Share2,
  Package,
  ImageOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatPrice } from "@/lib/marketplace-app/formatters";

type ListingDetailProps = {
  listing: {
    id: string;
    title: string;
    description: string;
    priceCents: number;
    status: string;
    sellerId: string;
    sellerLocation?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    images: string[];
  };
};

export function ListingDetail({ listing }: ListingDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Recently";
    return new Date(date).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

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

  const hasImages = listing.images.length > 0;
  const currentImage = hasImages ? listing.images[currentImageIndex] : null;
  const currentImageValid = currentImage && !imageError[currentImageIndex];

  const nextImage = () => {
    if (listing.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
    }
  };

  const prevImage = () => {
    if (listing.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <Link
        href="/marketplace-app"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to listings
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square relative bg-gradient-to-br from-muted to-muted/50 rounded-lg overflow-hidden">
            {currentImageValid ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage}
                  alt={listing.title}
                  className="absolute inset-0 w-full h-full object-contain"
                  onError={() => setImageError((prev) => ({ ...prev, [currentImageIndex]: true }))}
                />
                {/* Navigation arrows */}
                {listing.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/50">
                <ImageOff className="size-16" />
                <span className="text-sm font-medium">No image available</span>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {listing.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 size-16 rounded-md overflow-hidden border-2 transition-colors ${
                    index === currentImageIndex
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  {!imageError[index] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={`${listing.title} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => setImageError((prev) => ({ ...prev, [index]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Package className="size-4 text-muted-foreground/50" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Listing Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">{listing.title}</h1>
            <div className="text-3xl lg:text-4xl font-bold text-primary">
              {formatPrice(listing.priceCents)}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {listing.sellerLocation && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                <span>{formatLocation(listing.sellerLocation)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              <span>Listed {formatDate(listing.createdAt)}</span>
            </div>
          </div>

          {listing.status === "LIVE" && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Available
            </Badge>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button className="flex-1" size="lg">
              <MessageCircle className="size-4 mr-2" />
              Contact Seller
            </Button>
            <Button variant="outline" size="lg">
              <Heart className="size-4" />
            </Button>
            <Button variant="outline" size="lg">
              <Share2 className="size-4" />
            </Button>
          </div>

          <Separator />

          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold text-lg mb-3">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




