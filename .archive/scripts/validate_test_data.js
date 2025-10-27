#!/usr/bin/env node

/**
 * =====================================================
 * TEST DATA VALIDATION SCRIPT
 * =====================================================
 * 
 * Validates the 22 suppliers + 22 products test data
 * Provides comprehensive reporting and data quality checks
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    host: '62.169.20.53',
    port: 6600,
    database: 'nxtprod-db_001',
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
};

class TestDataValidator {
    constructor() {
        this.pool = new Pool(dbConfig);
        this.organizationId = '00000000-0000-0000-0000-000000000001';
        this.results = {
            suppliers: {},
            products: {},
            relationships: {},
            dataQuality: {},
            issues: []
        };
    }

    async connect() {
        try {
            this.client = await this.pool.connect();
            console.log('✅ Connected to PostgreSQL database');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async validateSuppliers() {
        console.log('📊 Validating suppliers...');

        try {
            // Check migration schema suppliers
            const migrationSuppliers = await this.client.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                    COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as with_email,
                    COUNT(CASE WHEN contact_phone IS NOT NULL THEN 1 END) as with_phone,
                    ROUND(AVG(risk_score), 1) as avg_risk,
                    ROUND(AVG(lead_time_days), 1) as avg_lead_time,
                    MIN(created_at) as oldest_record,
                    MAX(created_at) as newest_record
                FROM supplier 
                WHERE org_id = $1
            `, [this.organizationId]);

            this.results.suppliers.migration = migrationSuppliers.rows[0];

            // Check enhanced schema suppliers
            try {
                const enhancedSuppliers = await this.client.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                        COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
                        COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone,
                        COUNT(CASE WHEN preferred_supplier = true THEN 1 END) as preferred,
                        COUNT(DISTINCT performance_tier) as tier_varieties,
                        ROUND(AVG(rating::numeric), 2) as avg_rating,
                        MIN(created_at) as oldest_record,
                        MAX(created_at) as newest_record
                    FROM suppliers
                    WHERE supplier_code LIKE '%001'
                `);

                this.results.suppliers.enhanced = enhancedSuppliers.rows[0];
            } catch (error) {
                this.results.suppliers.enhanced = { error: 'Enhanced suppliers table not found or empty' };
            }

            console.log('✅ Supplier validation completed');
        } catch (error) {
            console.error('❌ Supplier validation failed:', error.message);
            this.results.issues.push(`Supplier validation: ${error.message}`);
        }
    }

    async validateProducts() {
        console.log('📦 Validating products...');

        try {
            // Check inventory_item products
            const inventoryProducts = await this.client.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active,
                    COUNT(DISTINCT category) as categories,
                    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price,
                    COUNT(CASE WHEN barcode IS NOT NULL THEN 1 END) as with_barcode,
                    ROUND(AVG(unit_price), 2) as avg_price,
                    MIN(unit_price) as min_price,
                    MAX(unit_price) as max_price,
                    SUM(quantity_on_hand) as total_stock,
                    COUNT(DISTINCT supplier_id) as unique_suppliers
                FROM inventory_item 
                WHERE org_id = $1
            `, [this.organizationId]);

            this.results.products.inventory = inventoryProducts.rows[0];

            // Check supplier_products
            try {
                const supplierProducts = await this.client.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                        COUNT(DISTINCT category) as categories,
                        COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price,
                        COUNT(CASE WHEN barcode IS NOT NULL THEN 1 END) as with_barcode,
                        ROUND(AVG(unit_price), 2) as avg_price,
                        MIN(unit_price) as min_price,
                        MAX(unit_price) as max_price,
                        SUM(stock_level) as total_stock,
                        COUNT(DISTINCT supplier_id) as unique_suppliers
                    FROM supplier_products sp
                    JOIN supplier s ON sp.supplier_id = s.id
                    WHERE s.org_id = $1
                `);

                this.results.products.supplier_products = supplierProducts.rows[0];
            } catch (error) {
                this.results.products.supplier_products = { error: 'supplier_products table not found or empty' };
            }

            console.log('✅ Product validation completed');
        } catch (error) {
            console.error('❌ Product validation failed:', error.message);
            this.results.issues.push(`Product validation: ${error.message}`);
        }
    }

    async validateRelationships() {
        console.log('🔗 Validating relationships...');

        try {
            // Check supplier-product relationships
            const relationships = await this.client.query(`
                SELECT 
                    COUNT(DISTINCT s.id) as suppliers_with_products,
                    COUNT(DISTINCT i.id) as products_with_suppliers,
                    COUNT(*) as total_relationships,
                    ROUND(AVG(s.lead_time_days), 1) as avg_supplier_lead_time,
                    ROUND(AVG(i.unit_price), 2) as avg_product_price
                FROM supplier s
                LEFT JOIN inventory_item i ON s.id = i.supplier_id
                WHERE s.org_id = $1 AND i.id IS NOT NULL
            `, [this.organizationId]);

            this.results.relationships.primary = relationships.rows[0];

            // Check for orphaned records
            const orphanedProducts = await this.client.query(`
                SELECT COUNT(*) as orphaned_products
                FROM inventory_item i
                LEFT JOIN supplier s ON i.supplier_id = s.id
                WHERE i.org_id = $1 AND s.id IS NULL
            `, [this.organizationId]);

            this.results.relationships.orphaned_products = orphanedProducts.rows[0].orphaned_products;

            const orphanedSuppliers = await this.client.query(`
                SELECT COUNT(*) as orphaned_suppliers
                FROM supplier s
                LEFT JOIN inventory_item i ON s.id = i.supplier_id
                WHERE s.org_id = $1 AND i.id IS NULL
            `, [this.organizationId]);

            this.results.relationships.orphaned_suppliers = orphanedSuppliers.rows[0].orphaned_suppliers;

            console.log('✅ Relationship validation completed');
        } catch (error) {
            console.error('❌ Relationship validation failed:', error.message);
            this.results.issues.push(`Relationship validation: ${error.message}`);
        }
    }

    async validateDataQuality() {
        console.log('🔍 Validating data quality...');

        try {
            // Check for data quality issues
            const qualityChecks = await this.client.query(`
                SELECT 
                    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_names,
                    COUNT(CASE WHEN contact_email IS NULL OR contact_email = '' THEN 1 END) as missing_emails,
                    COUNT(CASE WHEN contact_phone IS NULL OR contact_phone = '' THEN 1 END) as missing_phones,
                    COUNT(CASE WHEN contact_email NOT LIKE '%@%.%' THEN 1 END) as invalid_emails,
                    COUNT(CASE WHEN risk_score < 0 OR risk_score > 100 THEN 1 END) as invalid_risk_scores,
                    COUNT(CASE WHEN lead_time_days < 0 THEN 1 END) as invalid_lead_times
                FROM supplier 
                WHERE org_id = $1
            `, [this.organizationId]);

            this.results.dataQuality.suppliers = qualityChecks.rows[0];

            const productQualityChecks = await this.client.query(`
                SELECT 
                    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_names,
                    COUNT(CASE WHEN sku IS NULL OR sku = '' THEN 1 END) as missing_skus,
                    COUNT(CASE WHEN unit_price <= 0 THEN 1 END) as invalid_prices,
                    COUNT(CASE WHEN quantity_on_hand < 0 THEN 1 END) as negative_stock,
                    COUNT(CASE WHEN reorder_point < 0 THEN 1 END) as invalid_reorder_points
                FROM inventory_item 
                WHERE org_id = $1
            `, [this.organizationId]);

            this.results.dataQuality.products = productQualityChecks.rows[0];

            console.log('✅ Data quality validation completed');
        } catch (error) {
            console.error('❌ Data quality validation failed:', error.message);
            this.results.issues.push(`Data quality validation: ${error.message}`);
        }
    }

    async generateSampleData() {
        console.log('📋 Generating sample data...');

        try {
            // Get sample suppliers
            const sampleSuppliers = await this.client.query(`
                SELECT name, contact_email, status, risk_score, lead_time_days
                FROM supplier 
                WHERE org_id = $1
                ORDER BY name
                LIMIT 5
            `, [this.organizationId]);

            this.results.samples = {
                suppliers: sampleSuppliers.rows
            };

            // Get sample products
            const sampleProducts = await this.client.query(`
                SELECT i.name, i.sku, i.unit_price, i.quantity_on_hand, s.name as supplier_name
                FROM inventory_item i
                JOIN supplier s ON i.supplier_id = s.id
                WHERE i.org_id = $1
                ORDER BY i.unit_price DESC
                LIMIT 5
            `, [this.organizationId]);

            this.results.samples.products = sampleProducts.rows;

            console.log('✅ Sample data generated');
        } catch (error) {
            console.error('❌ Sample data generation failed:', error.message);
            this.results.issues.push(`Sample data generation: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST DATA VALIDATION REPORT');
        console.log('='.repeat(60));

        // Supplier Summary
        console.log('\n📈 SUPPLIER SUMMARY');
        console.log('-'.repeat(30));
        if (this.results.suppliers.migration) {
            const s = this.results.suppliers.migration;
            console.log(`Migration Schema Suppliers: ${s.total}`);
            console.log(`  ├─ Active: ${s.active}/${s.total}`);
            console.log(`  ├─ With Email: ${s.with_email}/${s.total}`);
            console.log(`  ├─ With Phone: ${s.with_phone}/${s.total}`);
            console.log(`  ├─ Avg Risk Score: ${s.avg_risk}/100`);
            console.log(`  └─ Avg Lead Time: ${s.avg_lead_time} days`);
        }

        if (this.results.suppliers.enhanced && !this.results.suppliers.enhanced.error) {
            const s = this.results.suppliers.enhanced;
            console.log(`Enhanced Schema Suppliers: ${s.total}`);
            console.log(`  ├─ Active: ${s.active}/${s.total}`);
            console.log(`  ├─ Preferred: ${s.preferred}/${s.total}`);
            console.log(`  ├─ Tier Varieties: ${s.tier_varieties}`);
            console.log(`  └─ Avg Rating: ${s.avg_rating}/5.0`);
        }

        // Product Summary
        console.log('\n📦 PRODUCT SUMMARY');
        console.log('-'.repeat(30));
        if (this.results.products.inventory) {
            const p = this.results.products.inventory;
            console.log(`Inventory Products: ${p.total}`);
            console.log(`  ├─ Active: ${p.active}/${p.total}`);
            console.log(`  ├─ Categories: ${p.categories}`);
            console.log(`  ├─ With Barcodes: ${p.with_barcode}/${p.total}`);
            console.log(`  ├─ Price Range: R${p.min_price} - R${p.max_price}`);
            console.log(`  ├─ Average Price: R${p.avg_price}`);
            console.log(`  ├─ Total Stock: ${p.total_stock} units`);
            console.log(`  └─ Suppliers: ${p.unique_suppliers}`);
        }

        if (this.results.products.supplier_products && !this.results.products.supplier_products.error) {
            const p = this.results.products.supplier_products;
            console.log(`Supplier Products: ${p.total}`);
            console.log(`  ├─ Active: ${p.active}/${p.total}`);
            console.log(`  ├─ Categories: ${p.categories}`);
            console.log(`  └─ Average Price: R${p.avg_price}`);
        }

        // Relationship Summary
        console.log('\n🔗 RELATIONSHIP SUMMARY');
        console.log('-'.repeat(30));
        if (this.results.relationships.primary) {
            const r = this.results.relationships.primary;
            console.log(`Suppliers with Products: ${r.suppliers_with_products}`);
            console.log(`Products with Suppliers: ${r.products_with_suppliers}`);
            console.log(`Total Relationships: ${r.total_relationships}`);
            console.log(`Orphaned Products: ${this.results.relationships.orphaned_products}`);
            console.log(`Orphaned Suppliers: ${this.results.relationships.orphaned_suppliers}`);
        }

        // Data Quality
        console.log('\n🔍 DATA QUALITY REPORT');
        console.log('-'.repeat(30));
        if (this.results.dataQuality.suppliers) {
            const q = this.results.dataQuality.suppliers;
            const qualityIssues = Object.values(q).reduce((sum, val) => sum + parseInt(val), 0);
            console.log(`Supplier Quality Issues: ${qualityIssues}`);
            if (qualityIssues > 0) {
                console.log(`  ├─ Missing Names: ${q.missing_names}`);
                console.log(`  ├─ Missing Emails: ${q.missing_emails}`);
                console.log(`  ├─ Missing Phones: ${q.missing_phones}`);
                console.log(`  ├─ Invalid Emails: ${q.invalid_emails}`);
                console.log(`  ├─ Invalid Risk Scores: ${q.invalid_risk_scores}`);
                console.log(`  └─ Invalid Lead Times: ${q.invalid_lead_times}`);
            }
        }

        if (this.results.dataQuality.products) {
            const q = this.results.dataQuality.products;
            const qualityIssues = Object.values(q).reduce((sum, val) => sum + parseInt(val), 0);
            console.log(`Product Quality Issues: ${qualityIssues}`);
            if (qualityIssues > 0) {
                console.log(`  ├─ Missing Names: ${q.missing_names}`);
                console.log(`  ├─ Missing SKUs: ${q.missing_skus}`);
                console.log(`  ├─ Invalid Prices: ${q.invalid_prices}`);
                console.log(`  ├─ Negative Stock: ${q.negative_stock}`);
                console.log(`  └─ Invalid Reorder Points: ${q.invalid_reorder_points}`);
            }
        }

        // Sample Data
        if (this.results.samples) {
            console.log('\n📋 SAMPLE SUPPLIERS');
            console.log('-'.repeat(30));
            this.results.samples.suppliers.forEach(supplier => {
                console.log(`${supplier.name} | ${supplier.contact_email} | ${supplier.status} | Risk: ${supplier.risk_score} | Lead: ${supplier.lead_time_days}d`);
            });

            console.log('\n📋 SAMPLE PRODUCTS (Top 5 by Price)');
            console.log('-'.repeat(30));
            this.results.samples.products.forEach(product => {
                console.log(`${product.name} | ${product.sku} | R${product.unit_price} | Stock: ${product.quantity_on_hand} | ${product.supplier_name}`);
            });
        }

        // Issues
        if (this.results.issues.length > 0) {
            console.log('\n⚠️ ISSUES FOUND');
            console.log('-'.repeat(30));
            this.results.issues.forEach(issue => {
                console.log(`❌ ${issue}`);
            });
        }

        // Overall Status
        console.log('\n🎯 VALIDATION STATUS');
        console.log('-'.repeat(30));
        const hasSuppliers = (this.results.suppliers.migration && this.results.suppliers.migration.total > 0) ||
                           (this.results.suppliers.enhanced && this.results.suppliers.enhanced.total > 0);
        const hasProducts = (this.results.products.inventory && this.results.products.inventory.total > 0) ||
                          (this.results.products.supplier_products && this.results.products.supplier_products.total > 0);
        const hasRelationships = this.results.relationships.primary && this.results.relationships.primary.total_relationships > 0;
        const qualityIssues = this.results.issues.length;

        if (hasSuppliers && hasProducts && hasRelationships && qualityIssues === 0) {
            console.log('✅ VALIDATION PASSED - Test data is ready for use');
        } else if (hasSuppliers && hasProducts && hasRelationships) {
            console.log('⚠️ VALIDATION PASSED WITH WARNINGS - Check quality issues above');
        } else {
            console.log('❌ VALIDATION FAILED - Missing critical data or relationships');
        }

        console.log('\n💡 RECOMMENDATIONS');
        console.log('-'.repeat(30));
        if (!hasSuppliers) {
            console.log('• Run supplier generation script');
        }
        if (!hasProducts) {
            console.log('• Run product generation script');
        }
        if (!hasRelationships) {
            console.log('• Check foreign key relationships');
        }
        if (qualityIssues > 0) {
            console.log('• Review data quality issues above');
        }
        if (hasSuppliers && hasProducts && hasRelationships) {
            console.log('• Test data is ready for development and testing');
            console.log('• Consider running performance tests with this data');
            console.log('• Validate business logic with realistic scenarios');
        }

        console.log('\n' + '='.repeat(60));
    }

    async cleanup() {
        if (this.client) {
            this.client.release();
        }
        await this.pool.end();
    }

    async run() {
        try {
            await this.connect();
            await this.validateSuppliers();
            await this.validateProducts();
            await this.validateRelationships();
            await this.validateDataQuality();
            await this.generateSampleData();
            this.generateReport();
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }
}

// Run validation
if (require.main === module) {
    console.log('🔍 Starting Test Data Validation');
    console.log('Checking 22 suppliers + 22 products data...\n');

    const validator = new TestDataValidator();
    validator.run().catch(console.error);
}

module.exports = TestDataValidator;