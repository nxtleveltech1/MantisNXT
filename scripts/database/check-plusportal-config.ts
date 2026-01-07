#!/usr/bin/env bun
/**
 * Check PlusPortal configuration for all suppliers
 */

import 'dotenv/config';
import { query } from '../../src/lib/database/unified-connection';

async function main() {
  console.log('='.repeat(70));
  console.log('📋 PlusPortal Supplier Configuration');
  console.log('='.repeat(70));
  console.log();

  const result = await query<{
    supplier_id: string;
    name: string;
    code: string;
    plusportal_enabled: boolean;
    plusportal_username: string | null;
    has_password: boolean;
    product_count: string;
  }>(
    `SELECT 
      s.supplier_id,
      s.name,
      s.code,
      COALESCE(s.plusportal_enabled, false) as plusportal_enabled,
      s.plusportal_username,
      (s.plusportal_password_encrypted IS NOT NULL AND s.plusportal_password_encrypted != '') as has_password,
      (SELECT COUNT(*) FROM core.supplier_product sp WHERE sp.supplier_id = s.supplier_id AND sp.is_active = true) as product_count
    FROM core.supplier s
    WHERE s.plusportal_username IS NOT NULL
    ORDER BY s.name`
  );

  if (result.rows.length === 0) {
    console.log('No suppliers with PlusPortal configured.\n');
    return;
  }

  console.log(`Found ${result.rows.length} suppliers with PlusPortal credentials:\n`);

  for (const s of result.rows) {
    const status = s.plusportal_enabled ? '✅ ENABLED' : '⏸️  DISABLED';
    const password = s.has_password ? '✅' : '❌';
    
    console.log(`📦 ${s.name} (${s.code})`);
    console.log(`   Status: ${status}`);
    console.log(`   Username: ${s.plusportal_username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Products: ${s.product_count}`);
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

