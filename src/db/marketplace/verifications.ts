import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { verificationStatusEnum } from "./enums";
import { listings } from "./listings";

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").references(() => listings.id).notNull(),
  status: verificationStatusEnum("status").default("NOT_REQUESTED").notNull(),
  inspectorNotes: text("inspector_notes"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

