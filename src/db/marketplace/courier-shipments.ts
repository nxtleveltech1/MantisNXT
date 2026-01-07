import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { courierStatusEnum } from "./enums";
import { sales } from "./sales";

export const courierShipments = pgTable("courier_shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").references(() => sales.id).notNull(),
  direction: text("direction", { enum: ["SELLER_TO_NXT", "NXT_TO_BUYER"] }).notNull(),
  status: courierStatusEnum("status"),
  trackingReference: text("tracking_reference"),
  costCents: integer("cost_cents"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CourierShipment = typeof courierShipments.$inferSelect;
export type NewCourierShipment = typeof courierShipments.$inferInsert;

