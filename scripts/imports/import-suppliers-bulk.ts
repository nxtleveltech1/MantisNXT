#!/usr/bin/env bun
/**
 * Bulk Supplier Import Script
 * 
 * Imports suppliers from CSV file with:
 * - Duplicate detection (by name/code)
 * - Internet search for missing information
 * - Complete supplier profile creation
 * - Related tables (contacts, addresses, performance)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const NEON_PROJECT_ID = 'proud-mud-50346856';
const DEFAULT_ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

interface SupplierRow {
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

interface SupplierData extends SupplierRow {
  supplier_id?: string;
  org_id: string;
  website?: string;
  enhanced_address?: any;
  enhanced_bank_details?: any;
}

// Map TIER 1/2/3 to performance tier enum values
function mapPerformanceTier(tier: string): string {
  const tierMap: Record<string, string> = {
    'TIER 1': 'platinum',
    'TIER 2': 'gold',
    'TIER 3': 'silver',
    'unrated': 'unrated',
  };
  return tierMap[tier.toUpperCase()] || 'unrated';
}

// Map status values
function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'inactive': 'inactive',
    'pending': 'pending_approval',
    'suspended': 'suspended',
  };
  return statusMap[status.toLowerCase()] || 'pending_approval';
}

// Parse CSV with semicolon delimiter
function parseCSV(filePath: string): SupplierRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';').map(h => h.trim());
  
  const suppliers: SupplierRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    if (values.length < headers.length) continue;
    
    const supplier: Partial<SupplierRow> = {};
    headers.forEach((header, idx) => {
      supplier[header as keyof SupplierRow] = values[idx]?.trim() || '';
    });
    
    if (supplier.name) {
      suppliers.push(supplier as SupplierRow);
    }
  }
  
  return suppliers;
}

// Search internet for supplier information
async function searchSupplierInfo(name: string, email?: string): Promise<{
  website?: string;
  address?: any;
  phone?: string;
}> {
  try {
    // Use web search to find supplier information
    const searchQuery = `${name} ${email || ''} South Africa contact website`;
    // Note: In actual implementation, this would use web_search tool
    // For now, return empty - will be enhanced with actual search
    return {};
  } catch (error) {
    console.error(`Error searching for ${name}:`, error);
    return {};
  }
}

// Check if supplier exists
async function findExistingSupplier(
  name: string,
  code?: string
): Promise<string | null> {
  const queries = [];
  const params: any[] = [];
  
  if (code) {
    queries.push(`SELECT supplier_id::text as id FROM core.supplier WHERE LOWER(code) = LOWER($${params.length + 1})`);
    params.push(code);
  }
  
  queries.push(`SELECT supplier_id::text as id FROM core.supplier WHERE LOWER(name) = LOWER($${params.length + 1})`);
  params.push(name);
  
  // This will be executed via Neon MCP
  // For now, return null - actual implementation will query database
  return null;
}

// Parse JSON safely
function parseJSON(jsonStr: string, defaultValue: any = {}): any {
  if (!jsonStr || jsonStr === '{}' || jsonStr.trim() === '') {
    return defaultValue;
  }
  try {
    return JSON.parse(jsonStr);
  } catch {
    return defaultValue;
  }
}

// Main import function
async function importSuppliers() {
  const csvPath = join(process.cwd(), 'c:\\00Project\\ODOO-ADMIN\\Outputs\\supplier_bulk_import_v1.csv');
  
  console.log('📂 Parsing CSV file...');
  const suppliers = parseCSV(csvPath);
  console.log(`✅ Found ${suppliers.length} suppliers to import`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const supplier of suppliers) {
    try {
      console.log(`\n🔄 Processing: ${supplier.name} (${supplier.code})`);
      
      // Check if exists
      const existingId = await findExistingSupplier(supplier.name, supplier.code);
      
      // Search for missing info
      const enhancedInfo = await searchSupplierInfo(
        supplier.name,
        supplier.contact_email || undefined
      );
      
      // Prepare supplier data
      const supplierData: SupplierData = {
        ...supplier,
        org_id: DEFAULT_ORG_ID,
        performance_tier: mapPerformanceTier(supplier.performance_tier),
        status: mapStatus(supplier.status),
        enhanced_address: parseJSON(supplier.address_json),
        enhanced_bank_details: parseJSON(supplier.bank_details_json),
        website: enhancedInfo.website,
      };
      
      if (existingId) {
        console.log(`  ⚠️  Supplier exists, updating...`);
        // Update existing supplier
        await updateSupplier(existingId, supplierData);
        updated++;
      } else {
        console.log(`  ➕ Creating new supplier...`);
        // Create new supplier
        await createSupplier(supplierData);
        created++;
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing ${supplier.name}:`, error);
      errors++;
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
}

// Create supplier (to be implemented with Neon MCP)
async function createSupplier(data: SupplierData): Promise<string> {
  // This will use Neon MCP run_sql_transaction
  throw new Error('Not implemented - will use Neon MCP');
}

// Update supplier (to be implemented with Neon MCP)
async function updateSupplier(id: string, data: SupplierData): Promise<void> {
  // This will use Neon MCP run_sql_transaction
  throw new Error('Not implemented - will use Neon MCP');
}

// Run import
if (import.meta.main) {
  importSuppliers().catch(console.error);
}


