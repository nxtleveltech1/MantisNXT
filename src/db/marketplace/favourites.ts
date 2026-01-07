import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { listings } from "./listings";
import { users } from "./users";

export const favourites = pgTable("favourites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  listingId: uuid("listing_id").references(() => listings.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserListing: uniqueIndex("favourites_user_listing_idx").on(table.userId, table.listingId),
}));

export type Favourite = typeof favourites.$inferSelect;
export type NewFavourite = typeof favourites.$inferInsert;

