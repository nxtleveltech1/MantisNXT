import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { financialStatusEnum, saleStatusEnum } from "./enums";
import { listings } from "./listings";
import { users } from "./users";

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").references(() => listings.id).notNull(),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  status: saleStatusEnum("status").default("INITIATED").notNull(),
  financialStatus: financialStatusEnum("financial_status").default("PENDING").notNull(),
  salePriceCents: integer("sale_price_cents").notNull(),
  commissionCents: integer("commission_cents").notNull(),
  sellerPayoutCents: integer("seller_payout_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;

