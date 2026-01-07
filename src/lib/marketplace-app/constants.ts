export const LISTING_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_ADMIN_REVIEW",
  "REJECTED",
  "APPROVED",
  "LIVE",
] as const;

export const VERIFICATION_STATUSES = [
  "NOT_REQUESTED",
  "AWAITING_ITEM",
  "IN_INSPECTION",
  "VERIFIED",
  "FAILED",
] as const;

export const SALE_STATUSES = [
  "INITIATED",
  "PENDING_VERIFICATION",
  "CONFIRMED",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const FINANCIAL_STATUSES = [
  "PENDING",
  "HELD_IN_ESCROW",
  "SETTLED",
  "PAID_OUT",
  "REFUNDED",
] as const;

export const COURIER_STATUSES = [
  "NOT_REQUIRED",
  "AWAITING_PICKUP",
  "IN_TRANSIT",
  "RECEIVED_AT_NXT",
  "DISPATCHED_TO_BUYER",
  "DELIVERED",
] as const;

export const SELLER_TIERS = [
  "STANDARD",
  "VERIFIED_SELLER",
  "GOLD_SELLER",
] as const;

export const USER_ROLES = ["SELLER", "BUYER", "ADMIN"] as const;

export const COMMISSION_RATE = 0.2; // 20%

export const PRODUCTION_DOMAIN = "nxtdotx.co.za";
export const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;

