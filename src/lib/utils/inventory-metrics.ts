export function calculateTurnover(
  totalOutbound: number,
  averageInventory: number,
  windowDays = 30
): number {
  const outbound = Math.max(0, Number(totalOutbound) || 0);
  const avgInv = Math.max(1, Number(averageInventory) || 1);
  // Normalize to annualized turnover based on window days
  const turnsInWindow = outbound / avgInv;
  const annualized = turnsInWindow * (365 / Math.max(1, windowDays));
  return isFinite(annualized) ? annualized : 0;
}

export function fillRate(fulfilled: number, requested: number): number {
  const req = Math.max(1, Number(requested) || 1);
  const ful = Math.max(0, Number(fulfilled) || 0);
  const rate = ful / req;
  return Math.max(0, Math.min(1, rate));
}

// Keep a copy here so components importing from this module continue to work
export type StockStatus = 'out_of_stock' | 'low_stock' | 'overstocked' | 'in_stock';
export function deriveStockStatus(current: number, reorder: number, max: number): StockStatus {
  if (current <= 0) return 'out_of_stock';
  if (reorder > 0 && current <= reorder) return 'low_stock';
  if (max > 0 && current > max) return 'overstocked';
  return 'in_stock';
}
