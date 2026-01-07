import { listingImages, listings } from "@/db/marketplace";
import type { Listing } from "@/db/marketplace/listings";
import { db } from "@/lib/marketplace-app/db";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

export async function getListingsBySellerId(sellerId: string) {
  return await db
    .select({
      listing: listings,
    })
    .from(listings)
    .where(eq(listings.sellerId, sellerId))
    .orderBy(desc(listings.createdAt));
}

export async function getListingWithImages(id: string) {
  const listing = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  if (!listing[0]) return null;

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, id))
    .orderBy(listingImages.sortOrder);

  return {
    ...listing[0],
    images,
  };
}

export async function getListingById(id: string) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  return listing || null;
}

export async function getListingImages(listingId: string) {
  return await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(listingImages.sortOrder);
}

export async function getPublicListings(options?: {
  verified?: boolean;
  status?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (options?.status && options.status.length > 0) {
    conditions.push(inArray(listings.status, options.status as Listing["status"][]));
  } else {
    // Default to LIVE listings if no status specified
    conditions.push(eq(listings.status, "LIVE"));
  }

  if (options?.search) {
    const searchTerm = `%${options.search}%`;
    conditions.push(
      or(
        ilike(listings.title, searchTerm),
        ilike(listings.description, searchTerm)
      )!
    );
  }

  let query = db.select().from(listings);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as typeof query;
  }

  query = query.orderBy(desc(listings.createdAt)) as typeof query;

  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  if (options?.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  return await query;
}

export async function getListingsByStatus(statuses: string[]) {
  return await db
    .select()
    .from(listings)
    .where(inArray(listings.status, statuses as Listing["status"][]))
    .orderBy(desc(listings.createdAt));
}

export async function createListing(data: {
  sellerId: string;
  title: string;
  description: string;
  priceCents: number;
  sellerLocation?: string | null;
  status?: string;
}) {
  const [listing] = await db
    .insert(listings)
    .values({
      sellerId: data.sellerId,
      title: data.title,
      description: data.description,
      priceCents: data.priceCents,
      sellerLocation: data.sellerLocation || null,
      status: (data.status as Listing["status"]) || "SUBMITTED",
      updatedAt: new Date(),
    })
    .returning();
  return listing;
}

export async function updateListing(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    priceCents: number;
    sellerLocation: string | null;
    status: string;
  }>
) {
  const updateData: {
    title?: string;
    description?: string;
    priceCents?: number;
    sellerLocation?: string | null;
    status?: Listing["status"];
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priceCents !== undefined) updateData.priceCents = data.priceCents;
  if (data.sellerLocation !== undefined) updateData.sellerLocation = data.sellerLocation;
  if (data.status !== undefined) updateData.status = data.status as Listing["status"];

  const [updated] = await db
    .update(listings)
    .set(updateData)
    .where(eq(listings.id, id))
    .returning();
  return updated;
}

export async function deleteListing(id: string) {
  await db.delete(listings).where(eq(listings.id, id));
}

export async function approveListing(id: string) {
  const [approved] = await db
    .update(listings)
    .set({
      status: "LIVE",
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id))
    .returning();
  return approved;
}

export async function rejectListing(id: string) {
  const [rejected] = await db
    .update(listings)
    .set({
      status: "REJECTED",
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id))
    .returning();
  return rejected;
}

