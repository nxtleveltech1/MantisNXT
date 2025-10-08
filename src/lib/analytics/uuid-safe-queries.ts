// UUID-safe query helpers for analytics
export function createSafeWhereClause(tableName: string, columnName: string, paramIndex: number = 1): string {
  const uuidColumns = new Map([
    ['suppliers', new Set(['id', 'organization_id'])],
    ['inventory_items', new Set(['id', 'organization_id', 'supplier_id'])],
    ['stock_movements', new Set(['organization_id', 'item_id'])],
    ['purchase_orders', new Set(['organization_id', 'supplier_id'])]
  ]);

  const isUUIDColumn = uuidColumns.get(tableName)?.has(columnName) || false;
  const fullColumn = tableName ? `${tableName}.${columnName}` : columnName;

  if (isUUIDColumn) {
    return `(${fullColumn}::text = $${paramIndex} OR ${fullColumn} = CAST($${paramIndex} AS UUID))`;
  } else {
    return `${fullColumn}::text = $${paramIndex}`;
  }
}

export function createSafeOrganizationFilter(organizationId: string): { where: string; params: [string] } {
  return {
    where: "organization_id::text = $1",
    params: [organizationId]
  };
}

export function createSafeSupplierFilter(supplierId: string): { where: string; params: [string] } {
  return {
    where: "(supplier_id::text = $1 OR supplier_id = CAST($1 AS UUID))",
    params: [supplierId]
  };
}
