import { differenceInDays } from 'date-fns';

export type Movement = {
  quantity: number;
  movement_type: 'inbound' | 'outbound' | 'transfer' | 'adjustment' | string;
  created_at: string | Date;
};

export function deriveStockStatus(current: number, reorder: number, max: number): 'out_of_stock' | 'low_stock' | 'overstocked' | 'in_stock' {
  if (current <= 0) return 'out_of_stock';
  if (reorder > 0 && current <= reorder) return 'low_stock';
  if (max > 0 && current > max) return 'overstocked';
  return 'in_stock';
}

export function calculateTurnover(totalOutboundQty: number, avgInventoryQty: number): number {
  if (!avgInventoryQty || avgInventoryQty <= 0) return 0;
  return +(totalOutboundQty / avgInventoryQty).toFixed(4);
}

export function movingAverage(values: number[], windowSize = 7): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = values.slice(start, i + 1);
    out.push(+((slice.reduce((a, b) => a + b, 0)) / slice.length).toFixed(4));
  }
  return out;
}

export function fillRate(fulfilled: number, requested: number): number {
  if (requested <= 0) return 1;
  return +(Math.max(0, Math.min(1, fulfilled / requested))).toFixed(4);
}

export function ageInDays(date: string | Date): number {
  try {
    return Math.max(0, differenceInDays(new Date(), new Date(date)));
  } catch {
    return 0;
  }
}

