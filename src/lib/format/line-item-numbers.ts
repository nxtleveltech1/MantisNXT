/**
 * Line-item quantity: whole units only (no fractional quantities).
 */
export function parseLineItemQuantity(raw: string): number {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

/**
 * Round currency amount to two decimal places (cent precision).
 */
export function roundMoney2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}
