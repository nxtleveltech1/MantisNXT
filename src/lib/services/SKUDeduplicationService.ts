/**
 * SKU Cross-Supplier Deduplication Service
 * Prevents creating products with SKUs that already exist under other suppliers
 */

import { query } from '@/lib/database';
import { findSupplierByName } from '@/lib/utils/supplier-matcher';

/**
 * Get supplier IDs for excluded suppliers (Sennheiser, Active Music Distribution, AV Distribution)
 */
async function getExcludedSupplierIds(): Promise<string[]> {
  const excludedNames = [
    'Sennheiser',
    'Active Music Distribution',
    'AV Distribution',
  ];

  const supplierIds: string[] = [];

  for (const name of excludedNames) {
    const supplierId = await findSupplierByName(name);
    if (supplierId) {
      supplierIds.push(supplierId);
    }
  }

  return supplierIds;
}

/**
 * Check if SKU already exists for excluded suppliers
 */
export async function checkSKUExistsInExcludedSuppliers(
  sku: string,
  excludedSupplierIds: string[]
): Promise<{ exists: boolean; existingSupplierId?: string; existingSupplierName?: string }> {
  if (excludedSupplierIds.length === 0) {
    return { exists: false };
  }

  const result = await query<{
    supplier_id: string;
    supplier_name: string;
  }>(
    `SELECT 
      sp.supplier_id,
      s.name as supplier_name
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    WHERE sp.supplier_sku = $1 
      AND sp.supplier_id = ANY($2::uuid[])
    LIMIT 1`,
    [sku, excludedSupplierIds]
  );

  if (result.rows.length > 0) {
    return {
      exists: true,
      existingSupplierId: result.rows[0].supplier_id,
      existingSupplierName: result.rows[0].supplier_name,
    };
  }

  return { exists: false };
}

/**
 * Determine if a product should be created for Stage Audio Works
 * Returns false if SKU already exists in excluded suppliers
 */
export async function shouldCreateProductForStageAudioWorks(
  sku: string,
  currentSupplierId: string
): Promise<{
  shouldCreate: boolean;
  reason?: string;
  existingSupplierId?: string;
  existingSupplierName?: string;
}> {
  // Get current supplier name
  const currentSupplierResult = await query<{ name: string }>(
    `SELECT name FROM core.supplier WHERE supplier_id = $1 LIMIT 1`,
    [currentSupplierId]
  );

  if (currentSupplierResult.rows.length === 0) {
    return { shouldCreate: false, reason: 'Current supplier not found' };
  }

  const currentSupplierName = currentSupplierResult.rows[0].name.toLowerCase();

  // Only apply this logic for Stage Audio Works
  if (!currentSupplierName.includes('stage audio works')) {
    return { shouldCreate: true };
  }

  // Get excluded supplier IDs
  const excludedSupplierIds = await getExcludedSupplierIds();

  if (excludedSupplierIds.length === 0) {
    return { shouldCreate: true };
  }

  // Check if SKU exists in excluded suppliers
  const checkResult = await checkSKUExistsInExcludedSuppliers(sku, excludedSupplierIds);

  if (checkResult.exists) {
    return {
      shouldCreate: false,
      reason: `SKU already exists for supplier: ${checkResult.existingSupplierName}`,
      existingSupplierId: checkResult.existingSupplierId,
      existingSupplierName: checkResult.existingSupplierName,
    };
  }

  return { shouldCreate: true };
}

/**
 * Batch check multiple SKUs for existence in excluded suppliers
 */
export async function batchCheckSKUs(
  skus: string[],
  excludedSupplierIds: string[]
): Promise<Map<string, { exists: boolean; supplierId?: string; supplierName?: string }>> {
  if (skus.length === 0 || excludedSupplierIds.length === 0) {
    return new Map();
  }

  const result = await query<{
    supplier_sku: string;
    supplier_id: string;
    supplier_name: string;
  }>(
    `SELECT 
      sp.supplier_sku,
      sp.supplier_id,
      s.name as supplier_name
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    WHERE sp.supplier_sku = ANY($1::text[])
      AND sp.supplier_id = ANY($2::uuid[])`,
    [skus, excludedSupplierIds]
  );

  const skuMap = new Map<string, { exists: boolean; supplierId?: string; supplierName?: string }>();

  // Initialize all SKUs as not existing
  for (const sku of skus) {
    skuMap.set(sku, { exists: false });
  }

  // Mark existing SKUs
  for (const row of result.rows) {
    skuMap.set(row.supplier_sku, {
      exists: true,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
    });
  }

  return skuMap;
}

