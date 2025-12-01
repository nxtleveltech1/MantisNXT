// src/app/api/inventory/adjustments/validation.ts
export function assertSaneQuantities(stock: number, reserved: number) {
  if (stock < 0) throw new Error('stock_qty cannot be negative');
  if (reserved < 0) throw new Error('reserved_qty cannot be negative');
  if (reserved > stock) throw new Error('reserved_qty cannot exceed stock_qty');
}

export async function validateAdjustment({
  currentStock,
  reserved,
  delta,
}: {
  currentStock: number;
  reserved: number;
  delta: number;
}) {
  const newStock = currentStock + delta;
  if (newStock < 0) throw new Error('Adjustment would make stock negative');
  if (reserved > newStock) throw new Error('Adjustment would put stock below reserved');
}
