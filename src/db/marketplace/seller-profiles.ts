import { integer, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { sellerTierEnum } from "./enums";
import { users } from "./users";

export const sellerProfiles = pgTable("seller_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  tier: sellerTierEnum("tier").default("STANDARD").notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0.0").notNull(),
  totalSales: integer("total_sales").default(0).notNull(),
  failedVerifications: integer("failed_verifications").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type NewSellerProfile = typeof sellerProfiles.$inferInsert;

