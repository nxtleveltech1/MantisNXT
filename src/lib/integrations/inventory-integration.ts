export * from './inventory-integration.v2';

export function findOrCreateCategory() {
  throw new Error(
    'INTEGRATION_DEPRECATED: category table not part of deployed schema. Use brand/supplier_product where applicable, or update plan.'
  );
}

export function findOrCreateBrand() {
  throw new Error(
    'INTEGRATION_DEPRECATED: use brand table in enhanced schema via inventory-integration.v2.ts'
  );
}

export function createInventoryItem() {
  throw new Error('INTEGRATION_DEPRECATED: use upsertInventoryItem in inventory-integration.v2.ts');
}
