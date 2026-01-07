import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { listingStatusEnum } from "./enums";
import { users } from "./users";

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  status: listingStatusEnum("status").default("SUBMITTED").notNull(),
  sellerLocation: text("seller_location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;

