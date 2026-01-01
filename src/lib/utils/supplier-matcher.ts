/**
 * Supplier Name Matching Utility
 * Handles fuzzy matching of supplier names with case-insensitive and spelling variation support
 */

import { query } from '@/lib/database';

/**
 * Normalize supplier name for matching
 */
export function normalizeSupplierName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

/**
 * Supplier name variations mapping
 */
const SUPPLIER_VARIANTS: Record<string, string[]> = {
  'sennheiser': ['sennheiser', 'sennhieser', 'sennheiser electronic'],
  'active music distribution': ['active music distribution', 'active music distrabution'],
  'av distribution': ['av distribution', 'av distrabution', 'a.v. distribution'],
  'stage audio works': ['stage audio works', 'stage audio works pty ltd'],
};

/**
 * Excluded suppliers (should not match)
 */
const EXCLUDED_SUPPLIERS = ['stage one'];

/**
 * Check if supplier name should be excluded
 */
function isExcluded(name: string): boolean {
  const normalized = normalizeSupplierName(name);
  return EXCLUDED_SUPPLIERS.some(excluded => normalized.includes(excluded));
}

/**
 * Find supplier ID by name with fuzzy matching
 */
export async function findSupplierByName(supplierName: string): Promise<string | null> {
  const normalized = normalizeSupplierName(supplierName);
  
  // Check if excluded
  if (isExcluded(supplierName)) {
    return null;
  }

  // Try exact match first (case-insensitive)
  const exactMatch = await query<{ supplier_id: string; name: string }>(
    `SELECT supplier_id, name 
     FROM core.supplier 
     WHERE LOWER(TRIM(name)) = $1 
     LIMIT 1`,
    [normalized]
  );

  if (exactMatch.rows.length > 0) {
    return exactMatch.rows[0].supplier_id;
  }

  // Try ILIKE match (partial match)
  const partialMatch = await query<{ supplier_id: string; name: string }>(
    `SELECT supplier_id, name 
     FROM core.supplier 
     WHERE LOWER(TRIM(name)) ILIKE $1 
     LIMIT 5`,
    [`%${normalized}%`]
  );

  if (partialMatch.rows.length === 0) {
    return null;
  }

  // If multiple matches, try to find best match using variants
  for (const [key, variants] of Object.entries(SUPPLIER_VARIANTS)) {
    if (variants.some(v => normalized.includes(v))) {
      const bestMatch = partialMatch.rows.find(row => 
        variants.some(v => normalizeSupplierName(row.name).includes(v))
      );
      if (bestMatch) {
        return bestMatch.supplier_id;
      }
    }
  }

  // Return first match if no variant match found
  // Filter out excluded suppliers
  const filtered = partialMatch.rows.filter(row => !isExcluded(row.name));
  if (filtered.length > 0) {
    return filtered[0].supplier_id;
  }

  return null;
}

/**
 * Get supplier name from database by ID
 */
export async function getSupplierNameById(supplierId: string): Promise<string | null> {
  const result = await query<{ name: string }>(
    `SELECT name FROM core.supplier WHERE supplier_id = $1 LIMIT 1`,
    [supplierId]
  );

  return result.rows[0]?.name || null;
}

/**
 * Check if supplier name matches any of the target suppliers
 */
export function isTargetSupplier(supplierName: string): boolean {
  const normalized = normalizeSupplierName(supplierName);
  
  const targetNames = [
    'sennheiser',
    'active music distribution',
    'av distribution',
    'stage audio works',
  ];

  return targetNames.some(target => normalized.includes(target));
}

