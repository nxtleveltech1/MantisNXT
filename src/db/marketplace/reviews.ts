import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sales } from "./sales";
import { users } from "./users";

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").references(() => sales.id).notNull(),
  reviewerId: uuid("reviewer_id").references(() => users.id).notNull(),
  revieweeId: uuid("reviewee_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(), // CHECK constraint handled in migration
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

