/**
 * Supplier Bulk Import Processor
 * Processes CSV and generates SQL for Neon MCP execution
 */

interface SupplierCSVRow {
  name: string;
  code: string;
  status: string;
  performance_tier: string;
  contact_email: string;
  contact_phone: string;
  tax_number: string;
  address_json: string;
  bank_details_json: string;
}

const CSV_PATH = 'c:\\00Project\\ODOO-ADMIN\\Outputs\\supplier_bulk_import_v1.csv';
const NEON_PROJECT_ID = 'proud-mud-50346856';
const DEFAULT_ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function mapPerformanceTier(tier: string): string {
  const map: Record<string, string> = {
    'TIER 1': 'platinum',
    'TIER 2': 'gold', 
    'TIER 3': 'silver',
    'unrated': 'unrated',
  };
  return map[tier.toUpperCase()] || 'unrated';
}

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    'active': 'active',
    'inactive': 'inactive',
    'pending': 'pending_approval',
    'suspended': 'suspended',
  };
  return map[status.toLowerCase()] || 'pending_approval';
}

function parseJSONSafe(str: string): any {
  if (!str || str === '{}' || str.trim() === '') return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

// This will be used to generate SQL statements
export function generateSupplierUpsertSQL(supplier: SupplierCSVRow, existingId?: string): string {
  const performanceTier = mapPerformanceTier(supplier.performance_tier);
  const status = mapStatus(supplier.status);
  const address = parseJSONSafe(supplier.address_json);
  const bankDetails = parseJSONSafe(supplier.bank_details_json);
  
  if (existingId) {
    // Update existing
    return `
      UPDATE core.supplier SET
        name = $1,
        code = $2,
        active = $3,
        contact_info = $4::jsonb,
        tax_number = $5,
        updated_at = NOW()
      WHERE supplier_id = $6::uuid
    `;
  } else {
    // Insert new
    return `
      INSERT INTO core.supplier (
        name, code, active, default_currency, 
        contact_info, tax_number, org_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'ZAR', $4::jsonb, $5, $6::uuid, NOW(), NOW()
      ) RETURNING supplier_id
    `;
  }
}


