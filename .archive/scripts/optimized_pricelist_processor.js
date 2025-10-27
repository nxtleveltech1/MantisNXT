#!/usr/bin/env node

/**
 * Optimized Production Price List Processor
 * Handles large files with batch processing and resume capability
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
const PROGRESS_FILE = path.join(__dirname, 'processing_progress.json');

class OptimizedPriceListProcessor {
    constructor() {
        this.pool = new Pool(DB_CONFIG);
        this.progress = this.loadProgress();
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

    // Load progress from file
    loadProgress() {
        if (fs.existsSync(PROGRESS_FILE)) {
            try {
                return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
            } catch (e) {
                console.log('⚠️ Could not load progress file, starting fresh');
            }
        }
        return { processedFiles: [], lastFile: null, totalProducts: 0 };
    }

    // Save progress to file
    saveProgress() {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
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
            client.release();
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    // Create or update supplier
    async createOrUpdateSupplier(supplierData) {
        const client = await this.pool.connect();

        try {
            // Check if supplier exists by name
            const existingSupplier = await client.query(
                'SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1)',
                [supplierData.name]
            );

            let supplierId;

            if (existingSupplier.rows.length > 0) {
                supplierId = existingSupplier.rows[0].id;
                this.stats.suppliersUpdated++;
            } else {
                // Generate supplier code
                const supplierCode = this.generateSupplierCode(supplierData.name);
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
                    supplierData.name,
                    null,
                    null,
                    null,
                    supplierData.category || 'General'
                ]);

                this.stats.suppliersCreated++;
                console.log(`➕ Created supplier: ${supplierData.name} (${supplierCode})`);
            }

            return supplierId;

        } finally {
            client.release();
        }
    }

    // Generate supplier code
    generateSupplierCode(name) {
        if (!name) return 'UNKNOWN';

        const words = name.toUpperCase().split(/\s+/);
        let code = '';

        if (words.length === 1) {
            code = words[0].substring(0, 6);
        } else {
            code = words[0].substring(0, 3) + words.slice(1).map(w => w[0]).join('');
        }

        return code.substring(0, 10);
    }

    // Detect supplier category
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

    // Parse Excel file with optimized memory usage
    async parseExcelFile(filePath) {
        try {
            console.log(`📋 Reading Excel file...`);
            const workbook = XLSX.readFile(filePath, { cellText: false, cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Get the range to process in chunks
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            const totalRows = range.e.r - range.s.r + 1;

            console.log(`📊 Processing ${totalRows} rows...`);

            // Find header row
            let headerRowIndex = -1;
            const headerPatterns = /sku|code|product|item|name|description|price|cost|dealer|retail/i;

            for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
                const row = [];
                for (let c = range.s.c; c <= range.e.c; c++) {
                    const cellAddress = XLSX.utils.encode_cell({ r, c });
                    const cell = worksheet[cellAddress];
                    row.push(cell ? String(cell.v) : '');
                }

                if (row.some(cell => cell && cell.match(headerPatterns))) {
                    headerRowIndex = r;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                throw new Error('Could not find header row');
            }

            // Extract headers
            const headers = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c });
                const cell = worksheet[cellAddress];
                headers.push(cell ? String(cell.v).toLowerCase().trim() : '');
            }

            // Map columns
            const columnMapping = this.mapColumns(headers);
            console.log(`📋 Found columns:`, Object.entries(columnMapping).map(([field, index]) =>
                `${field}=${headers[index] ? headers[index].substring(0, 20) : 'N/A'}`).join(', '));

            const products = [];

            // Process rows in chunks
            const chunkSize = 100;
            for (let startRow = headerRowIndex + 1; startRow <= range.e.r; startRow += chunkSize) {
                const endRow = Math.min(startRow + chunkSize - 1, range.e.r);

                for (let r = startRow; r <= endRow; r++) {
                    const row = [];
                    for (let c = range.s.c; c <= range.e.c; c++) {
                        const cellAddress = XLSX.utils.encode_cell({ r, c });
                        const cell = worksheet[cellAddress];
                        row.push(cell ? cell.v : '');
                    }

                    const product = this.extractProductFromRow(row, columnMapping);
                    if (product) {
                        products.push(product);
                    }
                }

                // Progress update
                if (startRow % 500 === 0) {
                    console.log(`  📖 Read ${startRow - headerRowIndex}/${range.e.r - headerRowIndex} rows...`);
                }
            }

            console.log(`📦 Extracted ${products.length} products`);
            return products;

        } catch (error) {
            console.error(`❌ Error parsing ${filePath}:`, error.message);
            this.stats.errors.push({ file: path.basename(filePath), error: error.message });
            return [];
        }
    }

    // Map common header variations to standard fields
    mapColumns(headers) {
        const fieldMapping = {
            sku: ['sku', 'code', 'item code', 'product code', 'part number', 'partno'],
            name: ['name', 'product', 'item', 'description', 'product name', 'item name', 'title'],
            description: ['description', 'desc', 'long description', 'full description', 'detail'],
            price: ['price', 'cost', 'dealer price', 'wholesale', 'unit price', 'sell price', 'dealer cost'],
            retail_price: ['retail', 'retail price', 'rrp', 'suggested retail', 'list price', 'retail inc'],
            brand: ['brand', 'manufacturer', 'make', 'mfg'],
            category: ['category', 'group', 'type', 'class', 'dept']
        };

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

        return columnMapping;
    }

    // Extract product data from row
    extractProductFromRow(row, columnMapping) {
        const product = {
            sku: this.cleanText(row[columnMapping.sku] || ''),
            name: this.cleanText(row[columnMapping.name] || ''),
            description: this.cleanText(row[columnMapping.description] || ''),
            price: this.parsePrice(row[columnMapping.price]),
            retail_price: this.parsePrice(row[columnMapping.retail_price]),
            brand: this.cleanText(row[columnMapping.brand] || ''),
            category: this.cleanText(row[columnMapping.category] || '')
        };

        // Skip rows without essential data
        if (!product.sku && !product.name) return null;
        if (!product.sku && product.name) {
            product.sku = this.generateSKU(product.name);
        }
        if (!product.sku || !product.price) return null;

        return product;
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

    // Bulk insert inventory items
    async bulkInsertInventoryItems(products, supplierId) {
        if (products.length === 0) return;

        const client = await this.pool.connect();
        const batchSize = 50;

        try {
            await client.query('BEGIN');

            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);

                // Check existing items
                const skus = batch.map(p => p.sku);
                const existingItems = await client.query(
                    'SELECT sku FROM inventory_items WHERE sku = ANY($1)',
                    [skus]
                );

                const existingSKUs = new Set(existingItems.rows.map(r => r.sku));

                // Separate new and existing items
                const newItems = batch.filter(p => !existingSKUs.has(p.sku));
                const updateItems = batch.filter(p => existingSKUs.has(p.sku));

                // Bulk insert new items
                if (newItems.length > 0) {
                    const insertValues = [];
                    const insertParams = [];
                    let paramIndex = 1;

                    for (const product of newItems) {
                        const id = this.generateUUID();
                        insertValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);

                        insertParams.push(
                            id, product.sku, product.name, product.description,
                            product.category, product.brand, supplierId,
                            product.price, product.retail_price || product.price,
                            0, 0, 5, 100, 'active', 'ZAR'
                        );
                    }

                    const insertSQL = `
                        INSERT INTO inventory_items (
                            id, sku, name, description, category, brand,
                            supplier_id, cost_price, sale_price, stock_qty,
                            reserved_qty, reorder_point, max_stock, status, currency
                        ) VALUES ${insertValues.join(', ')}
                    `;

                    await client.query(insertSQL, insertParams);
                    this.stats.productsCreated += newItems.length;
                }

                // Bulk update existing items
                if (updateItems.length > 0) {
                    for (const product of updateItems) {
                        await client.query(`
                            UPDATE inventory_items
                            SET name = $2, description = $3, category = $4, brand = $5,
                                cost_price = $6, sale_price = $7, updated_at = NOW()
                            WHERE sku = $1
                        `, [
                            product.sku, product.name, product.description,
                            product.category, product.brand, product.price,
                            product.retail_price || product.price
                        ]);
                    }
                    this.stats.productsUpdated += updateItems.length;
                }

                console.log(`  📦 Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)} (${newItems.length} new, ${updateItems.length} updated)`);
            }

            await client.query('COMMIT');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Process single file optimized
    async processPriceListFile(filePath) {
        const filename = path.basename(filePath);

        // Skip if already processed
        if (this.progress.processedFiles.includes(filename)) {
            console.log(`⏭️ Skipping already processed: ${filename}`);
            return;
        }

        const startTime = Date.now();
        console.log(`\n🔄 Processing: ${filename}`);

        try {
            // Extract supplier info
            const supplierName = this.extractSupplierFromFilename(filename);
            if (!supplierName) {
                throw new Error('Could not extract supplier name');
            }

            console.log(`🏢 Supplier: ${supplierName}`);

            // Create supplier
            const supplierData = {
                name: supplierName,
                category: this.detectSupplierCategory(supplierName, filename)
            };

            const supplierId = await this.createOrUpdateSupplier(supplierData);

            // Parse Excel file
            const products = await this.parseExcelFile(filePath);

            if (products.length === 0) {
                console.log(`⚠️ No products found in ${filename}`);
                this.stats.skippedFiles.push({ file: filename, reason: 'No products found' });
            } else {
                // Bulk insert products
                await this.bulkInsertInventoryItems(products, supplierId);
            }

            // Mark as processed
            this.progress.processedFiles.push(filename);
            this.progress.totalProducts += products.length;
            this.saveProgress();

            const processingTime = (Date.now() - startTime) / 1000;
            console.log(`✅ Completed ${filename} - ${products.length} products in ${processingTime.toFixed(1)}s`);
            this.stats.filesProcessed++;

        } catch (error) {
            console.error(`❌ Failed to process ${filename}:`, error.message);
            this.stats.errors.push({ file: filename, error: error.message });
        }
    }

    // Process all files with resume capability
    async processAllFiles() {
        const startTime = Date.now();
        console.log('🚀 Starting optimized production price list processing...\n');

        try {
            await this.connectDatabase();

            // Get all Excel files
            const files = fs.readdirSync(UPLOAD_DIR)
                .filter(file => /\.(xlsx|xls)$/i.test(file))
                .map(file => path.join(UPLOAD_DIR, file));

            console.log(`📁 Found ${files.length} Excel files to process`);
            console.log(`📋 Already processed: ${this.progress.processedFiles.length} files\n`);

            // Process remaining files
            for (const filePath of files) {
                await this.processPriceListFile(filePath);
            }

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
        console.log('📊 OPTIMIZED PRICE LIST PROCESSING REPORT');
        console.log('='.repeat(60));

        console.log(`⏱️  Total Processing Time: ${this.stats.processingTime.toFixed(1)} seconds`);
        console.log(`📁 Files Processed: ${this.stats.filesProcessed}`);
        console.log(`📦 Total Products: ${this.progress.totalProducts}`);
        console.log(`🏢 Suppliers Created: ${this.stats.suppliersCreated}`);
        console.log(`🔄 Suppliers Updated: ${this.stats.suppliersUpdated}`);
        console.log(`📦 Products Created: ${this.stats.productsCreated}`);
        console.log(`🔄 Products Updated: ${this.stats.productsUpdated}`);
        console.log(`⚠️  Errors: ${this.stats.errors.length}`);
        console.log(`⏭️  Skipped Files: ${this.stats.skippedFiles.length}`);

        if (this.stats.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.stats.errors.slice(0, 10).forEach((error, i) => {
                console.log(`  ${i + 1}. ${error.file}: ${error.error}`);
            });
        }

        console.log('\n' + '='.repeat(60));

        // Save detailed report
        const reportPath = path.join(__dirname, `optimized_report_${Date.now()}.json`);
        const fullReport = { ...this.stats, progress: this.progress };
        fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
        console.log(`📝 Detailed report saved to: ${reportPath}`);

        return this.stats;
    }
}

// Main execution
async function main() {
    const processor = new OptimizedPriceListProcessor();

    try {
        await processor.processAllFiles();
        processor.generateReport();

        // Clean up progress file on success
        if (fs.existsSync(PROGRESS_FILE)) {
            fs.unlinkSync(PROGRESS_FILE);
            console.log('🧹 Cleaned up progress file');
        }

        process.exit(0);

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

module.exports = { OptimizedPriceListProcessor };