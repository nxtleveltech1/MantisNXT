#!/usr/bin/env node

/**
 * Production Price List Processor
 * Processes 28 supplier price list files and uploads to production database
 *
 * Database: 62.169.20.53:6600/nxtprod-db_001
 * User: nxtdb_admin / P@33w0rd-1
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Production Database Configuration
const DB_CONFIG = {
    host: '62.169.20.53',
    port: 6600,
    database: 'nxtprod-db_001',
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

const UPLOAD_DIR = 'K:\\00Project\\MantisNXT\\database\\Uploads\\drive-download-20250904T012253Z-1-001';

class ProductionPriceListProcessor {
    constructor() {
        this.pool = new Pool(DB_CONFIG);
        this.processedSuppliers = new Map();
        this.processedProducts = new Map();
        this.stats = {
            filesProcessed: 0,
            suppliersCreated: 0,
            suppliersUpdated: 0,
            productsCreated: 0,
            productsUpdated: 0,
            errors: [],
            skippedFiles: [],
            processingTime: 0
        };
    }

    // Generate UUID v4
    generateUUID() {
        return crypto.randomUUID();
    }

    // Clean and normalize text
    cleanText(text) {
        if (!text) return null;
        return String(text).trim().replace(/\s+/g, ' ').substring(0, 255);
    }

    // Extract supplier name from filename
    extractSupplierFromFilename(filename) {
        const patterns = [
            /^([^_\-]+)/,  // Everything before first _ or -
            /^(.+?)\s+(?:pricelist|price|list|stock|soh)/i,
            /^(.+?)\.xlsx?$/i
        ];

        let supplierName = filename.replace(/\.xlsx?$/i, '');

        // Try patterns in order
        for (const pattern of patterns) {
            const match = supplierName.match(pattern);
            if (match && match[1].length > 2) {
                supplierName = match[1];
                break;
            }
        }

        return this.cleanText(supplierName);
    }

    // Connect to production database
    async connectDatabase() {
        try {
            const client = await this.pool.connect();
            console.log(`✅ Connected to production database: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);

            // Test query
            const result = await client.query('SELECT version()');
            console.log(`📊 Database version: ${result.rows[0].version.substring(0, 50)}...`);

            client.release();
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    // Create or update supplier (using production schema)
    async createOrUpdateSupplier(supplierData) {
        const client = await this.pool.connect();

        try {
            // Check if supplier exists by name or company_name
            const existingSupplier = await client.query(
                'SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1) OR LOWER(company_name) = LOWER($1)',
                [supplierData.name]
            );

            let supplierId;

            if (existingSupplier.rows.length > 0) {
                // Update existing supplier
                supplierId = existingSupplier.rows[0].id;
                await client.query(`
                    UPDATE suppliers
                    SET company_name = COALESCE($2, company_name),
                        contact_email = COALESCE($3, contact_email),
                        phone = COALESCE($4, phone),
                        status = 'active',
                        updated_at = NOW()
                    WHERE id = $1
                `, [supplierId, supplierData.company_name, supplierData.email, supplierData.phone]);

                this.stats.suppliersUpdated++;
                console.log(`🔄 Updated supplier: ${supplierData.name} (ID: ${supplierId})`);
            } else {
                // Generate supplier code from name
                const supplierCode = this.generateSupplierCode(supplierData.name);

                // Create new supplier
                supplierId = this.generateUUID();
                await client.query(`
                    INSERT INTO suppliers (
                        id, name, supplier_code, company_name, email, contact_email,
                        phone, status, performance_tier, primary_category,
                        created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 'unrated', $8, NOW(), NOW())
                `, [
                    supplierId,
                    supplierData.name,
                    supplierCode,
                    supplierData.company_name || supplierData.name,
                    supplierData.email,
                    supplierData.email,
                    supplierData.phone,
                    supplierData.category || 'General'
                ]);

                this.stats.suppliersCreated++;
                console.log(`➕ Created supplier: ${supplierData.name} (ID: ${supplierId}, Code: ${supplierCode})`);
            }

            this.processedSuppliers.set(supplierData.name.toLowerCase(), supplierId);
            return supplierId;

        } finally {
            client.release();
        }
    }

    // Generate supplier code
    generateSupplierCode(name) {
        if (!name) return 'UNKNOWN';

        // Extract initials and create code
        const words = name.toUpperCase().split(/\s+/);
        let code = '';

        if (words.length === 1) {
            code = words[0].substring(0, 6);
        } else {
            // Take first 2-3 chars from first word, then initials
            code = words[0].substring(0, 3) + words.slice(1).map(w => w[0]).join('');
        }

        return code.substring(0, 10);
    }

    // Extract email from filename (basic pattern detection)
    extractEmailFromFilename(filename) {
        // This would be enhanced if email addresses were in filenames
        return null;
    }

    // Extract phone from filename (basic pattern detection)
    extractPhoneFromFilename(filename) {
        // This would be enhanced if phone numbers were in filenames
        return null;
    }

    // Detect supplier category based on name patterns
    detectSupplierCategory(supplierName, filename) {
        const name = (supplierName + ' ' + filename).toLowerCase();

        const categories = {
            'Audio Equipment': ['audio', 'sound', 'music', 'speaker', 'microphone', 'yamaha', 'sennheiser'],
            'Pro Audio': ['pro audio', 'recording', 'studio', 'platinum'],
            'Musical Instruments': ['music', 'guitar', 'piano', 'drums', 'percussion', 'instrument'],
            'Technology': ['tech', 'alpha', 'technologies', 'digital'],
            'Distribution': ['distribution', 'wholesale', 'supply'],
            'Lighting & Stage': ['stage', 'light', 'av distribution'],
            'Electronics': ['electronic', 'multimedia', 'planet']
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => name.includes(keyword))) {
                return category;
            }
        }

        return 'General';
    }

    // Parse Excel file and extract products
    async parseExcelFile(filePath) {
        try {
            const workbook = XLSX.readFile(filePath, { cellText: false, cellDates: true });
            const sheetName = workbook.SheetNames[0]; // Use first sheet
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (data.length < 2) {
                throw new Error('Excel file has insufficient data');
            }

            // Find header row (contains SKU, Product, Price etc)
            let headerRowIndex = -1;
            const headerPatterns = /sku|code|product|item|name|description|price|cost|dealer|retail/i;

            for (let i = 0; i < Math.min(10, data.length); i++) {
                const row = data[i];
                if (Array.isArray(row) && row.some(cell =>
                    cell && String(cell).match(headerPatterns)
                )) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                throw new Error('Could not find header row in Excel file');
            }

            const headers = data[headerRowIndex].map(h => String(h || '').toLowerCase().trim());
            const products = [];

            // Map common header variations to standard fields
            const fieldMapping = {
                sku: ['sku', 'code', 'item code', 'product code', 'part number'],
                name: ['name', 'product', 'item', 'description', 'product name', 'item name'],
                description: ['description', 'desc', 'long description', 'full description'],
                price: ['price', 'cost', 'dealer price', 'wholesale', 'unit price', 'sell price'],
                retail_price: ['retail', 'retail price', 'rrp', 'suggested retail', 'list price'],
                brand: ['brand', 'manufacturer', 'make'],
                category: ['category', 'group', 'type', 'class']
            };

            // Create column mapping
            const columnMapping = {};
            for (const [field, patterns] of Object.entries(fieldMapping)) {
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i];
                    if (patterns.some(pattern => header.includes(pattern))) {
                        columnMapping[field] = i;
                        break;
                    }
                }
            }

            console.log(`📋 Found columns:`, Object.entries(columnMapping).map(([field, index]) =>
                `${field}=${headers[index]}`).join(', '));

            // Process data rows
            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i];
                if (!Array.isArray(row) || row.length === 0) continue;

                // Extract product data using column mapping
                const product = {
                    sku: this.cleanText(row[columnMapping.sku] || ''),
                    name: this.cleanText(row[columnMapping.name] || ''),
                    description: this.cleanText(row[columnMapping.description] || ''),
                    price: this.parsePrice(row[columnMapping.price]),
                    retail_price: this.parsePrice(row[columnMapping.retail_price]),
                    brand: this.cleanText(row[columnMapping.brand] || ''),
                    category: this.cleanText(row[columnMapping.category] || '')
                };

                // Skip rows without SKU or name
                if (!product.sku && !product.name) continue;

                // Generate SKU if missing
                if (!product.sku && product.name) {
                    product.sku = this.generateSKU(product.name);
                }

                // Skip if still no SKU or no price
                if (!product.sku || !product.price) continue;

                products.push(product);
            }

            console.log(`📦 Extracted ${products.length} products from ${path.basename(filePath)}`);
            return products;

        } catch (error) {
            console.error(`❌ Error parsing ${filePath}:`, error.message);
            this.stats.errors.push({ file: filePath, error: error.message });
            return [];
        }
    }

    // Parse price from various formats
    parsePrice(priceCell) {
        if (!priceCell) return null;

        let price = String(priceCell).replace(/[^\d.,]/g, '');
        if (!price) return null;

        // Handle comma as decimal separator
        if (price.includes(',') && !price.includes('.')) {
            price = price.replace(',', '.');
        } else if (price.includes(',') && price.includes('.')) {
            // Assume comma is thousands separator
            price = price.replace(/,/g, '');
        }

        const parsed = parseFloat(price);
        return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
    }

    // Generate SKU from product name
    generateSKU(name) {
        if (!name) return null;
        return name.toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 20) + '_' + Date.now().toString().slice(-4);
    }

    // Create or update inventory item directly (no separate products table)
    async createOrUpdateInventoryItem(productData, supplierId) {
        const client = await this.pool.connect();

        try {
            // Check if inventory item exists by SKU
            const existingItem = await client.query(
                'SELECT id FROM inventory_items WHERE sku = $1',
                [productData.sku]
            );

            let inventoryId;

            if (existingItem.rows.length > 0) {
                // Update existing inventory item
                inventoryId = existingItem.rows[0].id;
                await client.query(`
                    UPDATE inventory_items
                    SET name = $2,
                        description = $3,
                        category = $4,
                        brand = $5,
                        supplier_id = $6,
                        cost_price = $7,
                        sale_price = $8,
                        status = 'active',
                        currency = 'ZAR',
                        updated_at = NOW()
                    WHERE id = $1
                `, [
                    inventoryId,
                    productData.name,
                    productData.description,
                    productData.category,
                    productData.brand,
                    supplierId,
                    productData.price,
                    productData.retail_price || productData.price
                ]);

                this.stats.productsUpdated++;
                console.log(`🔄 Updated inventory item: ${productData.sku}`);
            } else {
                // Create new inventory item
                inventoryId = this.generateUUID();
                await client.query(`
                    INSERT INTO inventory_items (
                        id, sku, name, description, category, brand,
                        supplier_id, cost_price, sale_price, stock_qty,
                        reserved_qty, reorder_point, max_stock, status,
                        location, unit, currency, created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 5, 100, 'active', 'Warehouse', 'EA', 'ZAR', NOW(), NOW())
                `, [
                    inventoryId,
                    productData.sku,
                    productData.name,
                    productData.description,
                    productData.category,
                    productData.brand,
                    supplierId,
                    productData.price,
                    productData.retail_price || productData.price
                ]);

                this.stats.productsCreated++;
                console.log(`➕ Created inventory item: ${productData.sku}`);
            }

            return inventoryId;

        } finally {
            client.release();
        }
    }

    // Process single price list file
    async processPriceListFile(filePath) {
        const startTime = Date.now();
        const filename = path.basename(filePath);

        console.log(`\n🔄 Processing: ${filename}`);

        try {
            // Extract supplier info from filename
            const supplierName = this.extractSupplierFromFilename(filename);
            if (!supplierName) {
                throw new Error('Could not extract supplier name from filename');
            }

            console.log(`🏢 Supplier: ${supplierName}`);

            // Create or update supplier with enhanced data
            const supplierData = {
                name: supplierName,
                company_name: supplierName,
                email: this.extractEmailFromFilename(filename),
                phone: this.extractPhoneFromFilename(filename),
                category: this.detectSupplierCategory(supplierName, filename)
            };

            const supplierId = await this.createOrUpdateSupplier(supplierData);

            // Parse Excel file
            const products = await this.parseExcelFile(filePath);

            if (products.length === 0) {
                console.log(`⚠️ No products found in ${filename}`);
                this.stats.skippedFiles.push({ file: filename, reason: 'No products found' });
                return;
            }

            // Process products in batches
            const batchSize = 100;
            let processedCount = 0;

            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);

                for (const product of batch) {
                    try {
                        await this.createOrUpdateInventoryItem(product, supplierId);
                        processedCount++;

                        if (processedCount % 50 === 0) {
                            console.log(`  📦 Processed ${processedCount}/${products.length} products...`);
                        }
                    } catch (error) {
                        console.error(`    ❌ Error processing product ${product.sku}:`, error.message);
                        this.stats.errors.push({
                            file: filename,
                            product: product.sku,
                            error: error.message
                        });
                    }
                }
            }

            const processingTime = (Date.now() - startTime) / 1000;
            console.log(`✅ Completed ${filename} - ${processedCount} products in ${processingTime.toFixed(1)}s`);

            this.stats.filesProcessed++;

        } catch (error) {
            console.error(`❌ Failed to process ${filename}:`, error.message);
            this.stats.errors.push({ file: filename, error: error.message });
            this.stats.skippedFiles.push({ file: filename, reason: error.message });
        }
    }

    // Process all price list files
    async processAllFiles() {
        const startTime = Date.now();
        console.log('🚀 Starting production price list processing...\n');

        try {
            // Connect to database
            await this.connectDatabase();

            // Get all Excel files
            const files = fs.readdirSync(UPLOAD_DIR)
                .filter(file => /\.(xlsx|xls)$/i.test(file))
                .map(file => path.join(UPLOAD_DIR, file));

            console.log(`📁 Found ${files.length} Excel files to process\n`);

            // Process each file
            for (const filePath of files) {
                await this.processPriceListFile(filePath);
            }

            // Calculate total processing time
            this.stats.processingTime = (Date.now() - startTime) / 1000;

        } catch (error) {
            console.error('💥 Critical error during processing:', error.message);
            this.stats.errors.push({ file: 'SYSTEM', error: error.message });
        } finally {
            await this.pool.end();
        }
    }

    // Generate processing report
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PRODUCTION PRICE LIST PROCESSING REPORT');
        console.log('='.repeat(60));

        console.log(`⏱️  Total Processing Time: ${this.stats.processingTime.toFixed(1)} seconds`);
        console.log(`📁 Files Processed: ${this.stats.filesProcessed}`);
        console.log(`🏢 Suppliers Created: ${this.stats.suppliersCreated}`);
        console.log(`🔄 Suppliers Updated: ${this.stats.suppliersUpdated}`);
        console.log(`📦 Products Created: ${this.stats.productsCreated}`);
        console.log(`🔄 Products Updated: ${this.stats.productsUpdated}`);
        console.log(`⚠️  Errors: ${this.stats.errors.length}`);
        console.log(`⏭️  Skipped Files: ${this.stats.skippedFiles.length}`);

        if (this.stats.skippedFiles.length > 0) {
            console.log('\n📋 SKIPPED FILES:');
            this.stats.skippedFiles.forEach((skip, i) => {
                console.log(`  ${i + 1}. ${skip.file} - ${skip.reason}`);
            });
        }

        if (this.stats.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.stats.errors.slice(0, 10).forEach((error, i) => {
                console.log(`  ${i + 1}. ${error.file}${error.product ? ` (${error.product})` : ''}: ${error.error}`);
            });

            if (this.stats.errors.length > 10) {
                console.log(`  ... and ${this.stats.errors.length - 10} more errors`);
            }
        }

        console.log('\n' + '='.repeat(60));

        // Write detailed report to file
        const reportPath = path.join(__dirname, `processing_report_${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.stats, null, 2));
        console.log(`📝 Detailed report saved to: ${reportPath}`);

        return this.stats;
    }
}

// Main execution
async function main() {
    const processor = new ProductionPriceListProcessor();

    try {
        await processor.processAllFiles();
        const stats = processor.generateReport();

        // Exit with appropriate code
        process.exit(stats.errors.length > 0 ? 1 : 0);

    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { ProductionPriceListProcessor };