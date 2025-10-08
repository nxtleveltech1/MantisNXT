const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class PricelistProcessor {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'nxtdb_admin',
      host: process.env.DB_HOST || '62.169.20.53',
      database: process.env.DB_NAME || 'nxtprod-db_001',
      password: process.env.DB_PASSWORD || 'P@33w0rd-1',
      port: process.env.DB_PORT || 6600,
    });

    this.uploadsDir = path.join(__dirname, '..', 'database', 'Uploads', 'drive-download-20250904T012253Z-1-001');
    this.processedCount = 0;
    this.errorCount = 0;
    this.suppliers = new Map();
  }

  async getOrCreateSupplier(supplierName) {
    if (this.suppliers.has(supplierName)) {
      return this.suppliers.get(supplierName);
    }

    try {
      // Check if supplier exists
      const existingSupplier = await this.pool.query(
        'SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1)',
        [supplierName]
      );

      if (existingSupplier.rows.length > 0) {
        const supplierId = existingSupplier.rows[0].id;
        this.suppliers.set(supplierName, supplierId);
        return supplierId;
      }

      // Create supplier code from name
      const supplierCode = supplierName
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .map(word => word.substring(0, 3))
        .join('')
        .toUpperCase()
        .substring(0, 6);

      // Create new supplier
      const newSupplier = await this.pool.query(`
        INSERT INTO suppliers (id, name, supplier_code, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'active', NOW(), NOW())
        RETURNING id
      `, [uuidv4(), supplierName, supplierCode]);

      const supplierId = newSupplier.rows[0].id;
      this.suppliers.set(supplierName, supplierId);
      console.log(`✅ Created supplier: ${supplierName}`);
      return supplierId;

    } catch (error) {
      console.error(`❌ Error creating supplier ${supplierName}:`, error.message);
      return null;
    }
  }

  parsePrice(priceValue) {
    if (!priceValue) return 0;

    // Handle various price formats
    const cleanPrice = String(priceValue)
      .replace(/[R$€£,\s]/g, '') // Remove currency symbols and commas
      .replace(/[^0-9.]/g, ''); // Remove non-numeric characters except dots

    const parsed = parseFloat(cleanPrice);
    return isNaN(parsed) ? 0 : parsed;
  }

  generateSKU(brand, model, description) {
    const brandCode = (brand || '').substring(0, 3).toUpperCase();
    const modelCode = (model || '').replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase();
    const descCode = (description || '').replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();

    return `${brandCode}-${modelCode || descCode || 'ITEM'}`;
  }

  async insertInventoryItem(itemData) {
    try {
      const insertQuery = `
        INSERT INTO inventory_items (
          id, sku, name, description, brand, supplier_id,
          cost_price, sale_price, currency, stock_qty,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          cost_price = EXCLUDED.cost_price,
          sale_price = EXCLUDED.sale_price,
          updated_at = NOW()
        RETURNING id
      `;

      const result = await this.pool.query(insertQuery, [
        uuidv4(),
        itemData.sku,
        itemData.name,
        itemData.description,
        itemData.brand,
        itemData.supplierId,
        itemData.costPrice,
        itemData.salePrice,
        'ZAR',
        0, // Initial stock
        'active'
      ]);

      return result.rows[0].id;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`⚠️  SKU ${itemData.sku} already exists, skipping...`);
        return null;
      }
      throw error;
    }
  }

  async processApexProFormat(worksheet, supplierName) {
    console.log(`📋 Processing ApexPro format for ${supplierName}`);
    const supplierId = await this.getOrCreateSupplier(supplierName);
    if (!supplierId) return;

    let itemCount = 0;

    // ApexPro format: Brand | SKU | Description | Dealer Cost inc VAT | Dealer Selling Price Inc VAT | Stock Status | ETA
    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      const brand = row.getCell(1).text || '';
      const supplierSku = row.getCell(2).text || '';
      const description = row.getCell(3).text || '';
      const dealerCost = this.parsePrice(row.getCell(4).value);
      const dealerPrice = this.parsePrice(row.getCell(5).value);

      if (!description || !supplierSku) continue;

      const sku = this.generateSKU(brand, supplierSku, description);

      await this.insertInventoryItem({
        sku,
        name: description,
        description,
        brand,
        supplierId,
        costPrice: dealerCost,
        salePrice: dealerPrice
      });

      itemCount++;
    }

    console.log(`✅ Processed ${itemCount} items for ${supplierName}`);
    return itemCount;
  }

  async processAlphaFormat(worksheet, supplierName, sheetName) {
    console.log(`📋 Processing Alpha format for ${supplierName} - ${sheetName}`);
    const supplierId = await this.getOrCreateSupplier(supplierName);
    if (!supplierId) return;

    let itemCount = 0;

    // Alpha format: MODEL | DESCRIPTION | RETAIL | (additional columns)
    for (let rowNum = 4; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      const model = row.getCell(1).text || '';
      const description = row.getCell(2).text || '';
      const retail = this.parsePrice(row.getCell(3).value);

      if (!description || !model) continue;

      const sku = this.generateSKU(sheetName, model, description);

      await this.insertInventoryItem({
        sku,
        name: description,
        description,
        brand: sheetName,
        supplierId,
        costPrice: retail * 0.7, // Assume 30% markup
        salePrice: retail
      });

      itemCount++;
    }

    console.log(`✅ Processed ${itemCount} items for ${supplierName} - ${sheetName}`);
    return itemCount;
  }

  async processActiveFormat(worksheet, supplierName) {
    console.log(`📋 Processing Active format for ${supplierName}`);
    const supplierId = await this.getOrCreateSupplier(supplierName);
    if (!supplierId) return;

    let itemCount = 0;

    // Active format: Item No. | Item Description | Retail Ex VAT | Links
    for (let rowNum = 4; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      const itemNo = row.getCell(1).text || '';
      const description = row.getCell(2).text || '';
      const retail = this.parsePrice(row.getCell(3).value);

      if (!description || description.includes('ADAM HALL')) continue; // Skip header rows

      const sku = this.generateSKU('ACT', itemNo, description);

      await this.insertInventoryItem({
        sku,
        name: description,
        description,
        brand: 'Active Music',
        supplierId,
        costPrice: retail * 0.65, // Assume 35% markup
        salePrice: retail
      });

      itemCount++;
    }

    console.log(`✅ Processed ${itemCount} items for ${supplierName}`);
    return itemCount;
  }

  async processExcelFile(filename) {
    console.log(`\n🔍 Processing: ${filename}`);

    try {
      const workbook = new ExcelJS.Workbook();
      const filepath = path.join(this.uploadsDir, filename);
      await workbook.xlsx.readFile(filepath);

      let totalItems = 0;
      const supplierName = this.extractSupplierName(filename);

      // Determine format and process accordingly
      if (filename.includes('ApexPro')) {
        const worksheet = workbook.getWorksheet(1);
        totalItems = await this.processApexProFormat(worksheet, supplierName);
      } else if (filename.includes('Alpha-Technologies')) {
        // Process each worksheet in Alpha format
        for (const worksheet of workbook.worksheets) {
          if (worksheet.name === 'Front Page') continue;
          totalItems += await this.processAlphaFormat(worksheet, supplierName, worksheet.name) || 0;
        }
      } else if (filename.includes('ACTIVE MUSIC')) {
        const worksheet = workbook.getWorksheet(1);
        totalItems = await this.processActiveFormat(worksheet, supplierName);
      } else {
        // Generic format detection
        const worksheet = workbook.getWorksheet(1);
        totalItems = await this.processGenericFormat(worksheet, supplierName);
      }

      this.processedCount += (totalItems || 0);
      console.log(`✅ ${filename}: ${totalItems || 0} items processed`);

    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
      this.errorCount++;
    }
  }

  async processGenericFormat(worksheet, supplierName) {
    console.log(`📋 Processing generic format for ${supplierName}`);
    const supplierId = await this.getOrCreateSupplier(supplierName);
    if (!supplierId) return 0;

    let itemCount = 0;

    // Try to detect columns
    const headerRow = worksheet.getRow(1);
    const headers = [];
    for (let col = 1; col <= headerRow.cellCount; col++) {
      headers.push(headerRow.getCell(col).text.toLowerCase());
    }

    const skuCol = headers.findIndex(h => h.includes('sku') || h.includes('model') || h.includes('item')) + 1;
    const nameCol = headers.findIndex(h => h.includes('description') || h.includes('name')) + 1;
    const priceCol = headers.findIndex(h => h.includes('price') || h.includes('retail') || h.includes('cost')) + 1;

    if (!skuCol || !nameCol || !priceCol) {
      console.log(`⚠️  Could not detect columns for ${supplierName}`);
      return 0;
    }

    for (let rowNum = 2; rowNum <= Math.min(worksheet.rowCount, 100); rowNum++) {
      const row = worksheet.getRow(rowNum);

      const sku = row.getCell(skuCol).text || '';
      const name = row.getCell(nameCol).text || '';
      const price = this.parsePrice(row.getCell(priceCol).value);

      if (!name || !sku) continue;

      await this.insertInventoryItem({
        sku: this.generateSKU(supplierName, sku, name),
        name,
        description: name,
        brand: supplierName,
        supplierId,
        costPrice: price * 0.7,
        salePrice: price
      });

      itemCount++;
    }

    return itemCount;
  }

  extractSupplierName(filename) {
    // Extract supplier name from filename
    if (filename.includes('ApexPro')) return 'ApexPro Distribution';
    if (filename.includes('Alpha-Technologies')) return 'Alpha Technologies';
    if (filename.includes('ACTIVE MUSIC')) return 'Active Music Distribution';
    if (filename.includes('Audiolite')) return 'Audiolite';
    if (filename.includes('Audiosure')) return 'Audiosure';
    if (filename.includes('BK_Percussion')) return 'BK Percussion';
    if (filename.includes('Global Music')) return 'Global Music';
    if (filename.includes('Music Power')) return 'Music Power';
    if (filename.includes('Sennheiser')) return 'Sennheiser';
    if (filename.includes('YAMAHA')) return 'Yamaha';

    // Default to filename without extension
    return filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  }

  async processAllPricelists() {
    console.log('🚀 Starting price list processing...\n');

    try {
      const files = fs.readdirSync(this.uploadsDir)
        .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
        .slice(0, 10); // Process first 10 files for testing

      console.log(`📂 Found ${files.length} Excel files to process\n`);

      for (const filename of files) {
        await this.processExcelFile(filename);
      }

      console.log(`\n📊 Processing Summary:`);
      console.log(`   ✅ Total items processed: ${this.processedCount || 0}`);
      console.log(`   ❌ Files with errors: ${this.errorCount}`);
      console.log(`   👥 Suppliers created/updated: ${this.suppliers.size}`);

    } catch (error) {
      console.error('❌ Fatal error during processing:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the processor
const processor = new PricelistProcessor();
processor.processAllPricelists();