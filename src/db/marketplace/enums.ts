import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "SELLER",
  "BUYER",
  "ADMIN",
]);

export const sellerTierEnum = pgEnum("seller_tier", [
  "STANDARD",
  "VERIFIED_SELLER",
  "GOLD_SELLER",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "DRAFT",
  "SUBMITTED",
  "UNDER_ADMIN_REVIEW",
  "REJECTED",
  "APPROVED",
  "LIVE",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "NOT_REQUESTED",
  "AWAITING_ITEM",
  "IN_INSPECTION",
  "VERIFIED",
  "FAILED",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "INITIATED",
  "PENDING_VERIFICATION",
  "CONFIRMED",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

export const courierStatusEnum = pgEnum("courier_status", [
  "NOT_REQUIRED",
  "AWAITING_PICKUP",
  "IN_TRANSIT",
  "RECEIVED_AT_NXT",
  "DISPATCHED_TO_BUYER",
  "DELIVERED",
]);

export const financialStatusEnum = pgEnum("financial_status", [
  "PENDING",
  "HELD_IN_ESCROW",
  "SETTLED",
  "PAID_OUT",
  "REFUNDED",
]);

