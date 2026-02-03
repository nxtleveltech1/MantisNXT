#!/usr/bin/env bun
/**
 * Add Celto Brand Discount Rule for BC Electronics
 *
 * Creates a 10% brand-level discount rule for Celto products from BC Electronics,
 * similar to how discount rules are configured for my.portal suppliers.
 *
 * Usage:
 *   bun scripts/database/add-celto-discount-rule.ts
 */

import { Client } from 'pg';

// Get connection string from environment
function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_SPP_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    null
  );
}

const SUPPLIER_NAME = 'BC ELECTRONICS';
const BRAND_NAME = 'CELTO';
const DISCOUNT_PERCENT = 10;
const RULE_NAME = 'Celto Brand 10% Discount';

/**
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 OR LOWER(name) LIKE $3
     LIMIT 5`,
    [
      `%${supplierName.toLowerCase()}%`,
      `%bce brands%`,
      `%bc electronics%`,
    ]
  );

  if (result.rows.length === 0) {
    console.error(`❌ Supplier "${supplierName}" not found`);
    return null;
  }

  const supplier = result.rows[0];
  console.log(
    `✅ Found supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`
  );
  return supplier.supplier_id;
}

/**
 * Find or create brand
 */
async function findOrCreateBrand(client: Client, brandName: string): Promise<string | null> {
  const normalizedName = brandName.trim().toUpperCase();

  // Try to find brand in public.brand
  const findResult = await client.query<{ id: string }>(
    `SELECT id FROM public.brand 
     WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
     LIMIT 1`,
    [normalizedName]
  );

  if (findResult.rows.length > 0) {
    console.log(`✅ Found brand: ${brandName} (ID: ${findResult.rows[0].id})`);
    return findResult.rows[0].id;
  }

  // Try to create brand - handle both with and without org_id
  try {
    // First try without org_id
    const insertResult = await client.query<{ id: string }>(
      `INSERT INTO public.brand (name, is_active, created_at, updated_at)
       VALUES ($1, true, NOW(), NOW())
       RETURNING id`,
      [normalizedName]
    );

    if (insertResult.rows.length > 0) {
      console.log(`✅ Created brand: ${brandName} (ID: ${insertResult.rows[0].id})`);
      return insertResult.rows[0].id;
    }
  } catch (error: any) {
    // If that fails, try with org_id
    if (error?.message?.includes('org_id') || error?.code === '23502') {
      const orgResult = await client.query<{ id: string }>(
        `SELECT id FROM public.organization ORDER BY created_at LIMIT 1`
      );

      if (orgResult.rows.length > 0) {
        const orgId = orgResult.rows[0].id;
        const insertResult = await client.query<{ id: string }>(
          `INSERT INTO public.brand (org_id, name, is_active, created_at, updated_at)
           VALUES ($1, $2, true, NOW(), NOW())
           RETURNING id`,
          [orgId, normalizedName]
        );

        if (insertResult.rows.length > 0) {
          console.log(`✅ Created brand: ${brandName} (ID: ${insertResult.rows[0].id})`);
          return insertResult.rows[0].id;
        }
      }
    }
    throw error;
  }

  console.error(`❌ Failed to create brand: ${brandName}`);
  return null;
}


/**
 * Create discount rule (upsert - insert or update if exists)
 */
async function createDiscountRule(
  client: Client,
  supplierId: string,
  brandId: string
): Promise<boolean> {
  // Check if rule exists first
  const existing = await client.query(
    `SELECT discount_rule_id 
     FROM core.supplier_discount_rules
     WHERE supplier_id = $1 
       AND scope_type = 'brand'
       AND brand_id = $2`,
    [supplierId, brandId]
  );

  if (existing.rows.length > 0) {
    // Update existing rule
    const updateResult = await client.query(
      `UPDATE core.supplier_discount_rules
       SET discount_percent = $1,
           rule_name = $2,
           priority = $3,
           is_active = $4,
           updated_at = NOW()
       WHERE discount_rule_id = $5
       RETURNING discount_rule_id`,
      [DISCOUNT_PERCENT, RULE_NAME, 10, true, existing.rows[0].discount_rule_id]
    );

    if (updateResult.rows.length > 0) {
      console.log(`✅ Updated existing discount rule (ID: ${updateResult.rows[0].discount_rule_id})`);
      return true;
    }
  } else {
    // Create new rule
    const insertResult = await client.query(
      `INSERT INTO core.supplier_discount_rules (
         supplier_id, rule_name, discount_percent, scope_type,
         brand_id, priority, is_active, valid_from
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING discount_rule_id`,
      [
        supplierId,
        RULE_NAME,
        DISCOUNT_PERCENT,
        'brand',
        brandId,
        10, // Higher priority for brand-level rules
        true,
      ]
    );

    if (insertResult.rows.length > 0) {
      console.log(`✅ Created discount rule (ID: ${insertResult.rows[0].discount_rule_id})`);
      return true;
    }
  }

  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Adding Celto Brand Discount Rule for BC Electronics\n');

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('❌ Database connection string not found');
    console.error('   Please set DATABASE_URL or NEON_SPP_DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find supplier
    const supplierId = await findSupplier(client, SUPPLIER_NAME);
    if (!supplierId) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found`);
    }

    // Find or create brand
    const brandId = await findOrCreateBrand(client, BRAND_NAME);
    if (!brandId) {
      throw new Error(`Failed to find or create brand "${BRAND_NAME}"`);
    }

    // Create discount rule
    const success = await createDiscountRule(client, supplierId, brandId);
    if (!success) {
      throw new Error('Failed to create discount rule');
    }

    console.log(`\n✅ Successfully configured ${DISCOUNT_PERCENT}% discount rule for Celto brand`);
    console.log(`   Supplier: BC Electronics (${supplierId})`);
    console.log(`   Brand: Celto (${brandId})`);
    console.log(`   Discount: ${DISCOUNT_PERCENT}%`);
    console.log(`\n📋 The discount rule will now appear in the supplier portfolio discount rules section`);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
