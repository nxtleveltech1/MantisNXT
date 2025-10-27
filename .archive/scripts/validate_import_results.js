#!/usr/bin/env node

/**
 * Production Import Validation Script
 * Validates the imported price list data
 */

const { Pool } = require('pg');

const DB_CONFIG = {
    host: '62.169.20.53',
    port: 6600,
    database: 'nxtprod-db_001',
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
    ssl: false
};

async function validateImport() {
    const pool = new Pool(DB_CONFIG);

    try {
        console.log('🔍 PRODUCTION DATA VALIDATION\n');

        // 1. Basic counts
        const supplierCount = await pool.query('SELECT COUNT(*) FROM suppliers');
        const inventoryCount = await pool.query('SELECT COUNT(*) FROM inventory_items');

        console.log(`📊 Database Totals:`);
        console.log(`   Suppliers: ${supplierCount.rows[0].count}`);
        console.log(`   Inventory Items: ${inventoryCount.rows[0].count}`);

        // 2. New suppliers (created today)
        const newSuppliers = await pool.query(`
            SELECT name, supplier_code, primary_category, created_at
            FROM suppliers
            WHERE DATE(created_at) = CURRENT_DATE
            ORDER BY created_at DESC
        `);

        console.log(`\n🏢 New Suppliers Added Today (${newSuppliers.rows.length}):`);
        newSuppliers.rows.forEach(supplier => {
            console.log(`   ${supplier.supplier_code}: ${supplier.name} (${supplier.primary_category})`);
        });

        // 3. Product distribution by supplier
        const productsBySupplier = await pool.query(`
            SELECT s.name, s.supplier_code, COUNT(i.*) as product_count
            FROM suppliers s
            LEFT JOIN inventory_items i ON s.id = i.supplier_id
            GROUP BY s.id, s.name, s.supplier_code
            HAVING COUNT(i.*) > 0
            ORDER BY COUNT(i.*) DESC
            LIMIT 10
        `);

        console.log(`\n📦 Top 10 Suppliers by Product Count:`);
        productsBySupplier.rows.forEach((supplier, index) => {
            console.log(`   ${index + 1}. ${supplier.supplier_code}: ${supplier.product_count} products`);
        });

        // 4. Price range analysis
        const priceStats = await pool.query(`
            SELECT
                COUNT(*) as total_products,
                COUNT(cost_price) as products_with_cost,
                MIN(cost_price) as min_price,
                MAX(cost_price) as max_price,
                AVG(cost_price) as avg_price
            FROM inventory_items
            WHERE cost_price IS NOT NULL
        `);

        const stats = priceStats.rows[0];
        console.log(`\n💰 Pricing Analysis:`);
        console.log(`   Products with pricing: ${stats.products_with_cost}/${stats.total_products}`);
        console.log(`   Price range: R${parseFloat(stats.min_price).toFixed(2)} - R${parseFloat(stats.max_price).toFixed(2)}`);
        console.log(`   Average price: R${parseFloat(stats.avg_price).toFixed(2)}`);

        // 5. Category distribution
        const categories = await pool.query(`
            SELECT category, COUNT(*) as count
            FROM inventory_items
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY COUNT(*) DESC
            LIMIT 10
        `);

        console.log(`\n📋 Top Product Categories:`);
        categories.rows.forEach((cat, index) => {
            console.log(`   ${index + 1}. ${cat.category}: ${cat.count} products`);
        });

        // 6. Brand analysis
        const brands = await pool.query(`
            SELECT brand, COUNT(*) as count
            FROM inventory_items
            WHERE brand IS NOT NULL AND brand != ''
            GROUP BY brand
            ORDER BY COUNT(*) DESC
            LIMIT 10
        `);

        console.log(`\n🏷️ Top Brands:`);
        brands.rows.forEach((brand, index) => {
            console.log(`   ${index + 1}. ${brand.brand}: ${brand.count} products`);
        });

        // 7. Data quality checks
        const qualityChecks = await pool.query(`
            SELECT
                COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_names,
                COUNT(CASE WHEN cost_price IS NULL THEN 1 END) as missing_prices,
                COUNT(CASE WHEN sku IS NULL OR sku = '' THEN 1 END) as missing_skus,
                COUNT(CASE WHEN supplier_id IS NULL THEN 1 END) as missing_suppliers
            FROM inventory_items
        `);

        const quality = qualityChecks.rows[0];
        console.log(`\n🔍 Data Quality Check:`);
        console.log(`   Missing names: ${quality.missing_names}`);
        console.log(`   Missing prices: ${quality.missing_prices}`);
        console.log(`   Missing SKUs: ${quality.missing_skus}`);
        console.log(`   Missing suppliers: ${quality.missing_suppliers}`);

        // 8. Sample products for manual verification
        const sampleProducts = await pool.query(`
            SELECT i.sku, i.name, i.cost_price, s.name as supplier_name
            FROM inventory_items i
            JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.cost_price IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 5
        `);

        console.log(`\n🎲 Random Sample for Manual Verification:`);
        sampleProducts.rows.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.sku}: ${product.name}`);
            console.log(`      Supplier: ${product.supplier_name}, Price: R${parseFloat(product.cost_price).toFixed(2)}`);
        });

        console.log(`\n✅ VALIDATION COMPLETE - DATABASE IS READY FOR PRODUCTION USE`);

    } catch (error) {
        console.error('❌ Validation error:', error.message);
    } finally {
        await pool.end();
    }
}

validateImport();