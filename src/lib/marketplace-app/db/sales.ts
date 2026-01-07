import { listings, sales, users } from "@/db/marketplace";
import type { Sale } from "@/db/marketplace/sales";
import { COMMISSION_RATE } from "@/lib/marketplace-app/constants";
import { db } from "@/lib/marketplace-app/db";
import { desc, eq, or } from "drizzle-orm";

export async function getSalesByBuyerId(buyerId: string) {
  const results = await db
    .select({
      sale: sales,
      listing: listings,
      sellerId: sales.sellerId,
    })
    .from(sales)
    .innerJoin(listings, eq(sales.listingId, listings.id))
    .where(eq(sales.buyerId, buyerId))
    .orderBy(desc(sales.createdAt));

  const salesWithSeller = await Promise.all(
    results.map(async (item) => {
      const [seller] = await db
        .select()
        .from(users)
        .where(eq(users.id, item.sellerId))
        .limit(1);
      return {
        sale: item.sale,
        listing: item.listing,
        seller: seller!,
      };
    })
  );

  return salesWithSeller;
}

export async function getSalesBySellerId(sellerId: string) {
  const results = await db
    .select({
      sale: sales,
      listing: listings,
      buyerId: sales.buyerId,
    })
    .from(sales)
    .innerJoin(listings, eq(sales.listingId, listings.id))
    .where(eq(sales.sellerId, sellerId))
    .orderBy(desc(sales.createdAt));

  const salesWithBuyer = await Promise.all(
    results.map(async (item) => {
      const [buyer] = await db
        .select()
        .from(users)
        .where(eq(users.id, item.buyerId))
        .limit(1);
      return {
        sale: item.sale,
        listing: item.listing,
        buyer: buyer!,
      };
    })
  );

  return salesWithBuyer;
}

export async function getSalesByUserId(userId: string) {
  const results = await db
    .select({
      sale: sales,
      listing: listings,
    })
    .from(sales)
    .innerJoin(listings, eq(sales.listingId, listings.id))
    .where(or(eq(sales.buyerId, userId), eq(sales.sellerId, userId))!)
    .orderBy(desc(sales.createdAt));

  return results.map((item) => item.sale);
}

export async function getSaleById(id: string) {
  const [sale] = await db
    .select()
    .from(sales)
    .where(eq(sales.id, id))
    .limit(1);
  return sale;
}

export async function getSaleWithDetails(id: string) {
  const [saleData] = await db
    .select({
      sale: sales,
      listing: listings,
      sellerId: sales.sellerId,
      buyerId: sales.buyerId,
    })
    .from(sales)
    .innerJoin(listings, eq(sales.listingId, listings.id))
    .where(eq(sales.id, id))
    .limit(1);

  if (!saleData) return null;

  const [seller] = await db.select().from(users).where(eq(users.id, saleData.sellerId)).limit(1);
  const [buyer] = await db.select().from(users).where(eq(users.id, saleData.buyerId)).limit(1);

  return {
    sale: saleData.sale,
    listing: saleData.listing,
    seller: seller!,
    buyer: buyer!,
  };
}

export async function createSale(data: {
  listingId: string;
  buyerId: string;
  sellerId: string;
  salePriceCents: number;
  courierCostsCents?: number;
  status: string;
  financialStatus: string;
}) {
  // Commission is calculated on sale price only, not including courier costs
  const commissionCents = Math.round(data.salePriceCents * COMMISSION_RATE);
  const sellerPayoutCents = data.salePriceCents - commissionCents;

  const [sale] = await db
    .insert(sales)
    .values({
      listingId: data.listingId,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      salePriceCents: data.salePriceCents,
      commissionCents,
      sellerPayoutCents,
      status: data.status as Sale["status"],
      financialStatus: data.financialStatus as Sale["financialStatus"],
    })
    .returning();
  return sale;
}

export async function updateSaleStatus(
  id: string,
  status: string,
  financialStatus?: string
) {
  const updateData: {
    status: Sale["status"];
    financialStatus?: Sale["financialStatus"];
    updatedAt?: Date;
  } = {
    status: status as Sale["status"],
  };
  if (financialStatus) {
    updateData.financialStatus = financialStatus as Sale["financialStatus"];
  }

  const [updated] = await db
    .update(sales)
    .set(updateData)
    .where(eq(sales.id, id))
    .returning();
  return updated;
}

