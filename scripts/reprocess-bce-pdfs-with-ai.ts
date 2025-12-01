#!/usr/bin/env bun
/**
 * Reprocess BCE Brands PDF uploads with AI extraction
 */

import { readFileSync } from 'fs';
import { query } from '../src/lib/database/unified-connection';
import { AIPriceExtractionService } from '../src/lib/services/supplier/AIPriceExtractionService';
import { pricelistService } from '../src/lib/services/PricelistService';

const UPLOAD_IDS = [
  {
    id: '66ca979d-f31f-4e12-9e2d-6af0d2742667',
    file: 'K:\\00Project\\MantisNXT - Uploads\\All files\\2025_BCE_Brands_Pricelist_June_Final.01.pdf',
    name: 'June',
  },
  {
    id: '0a791594-80d4-42fa-aa33-f1831782a9b0',
    file: 'K:\\00Project\\MantisNXT - Uploads\\All files\\2025_BCE_Brands_Pricelist_September BC ELECTRONICS.pdf',
    name: 'September',
  },
];

const SUPPLIER_ID = '550e3600-1d08-4870-9711-bb95b753c30d'; // BCE Brands

async function main() {
  console.log('🤖 Reprocessing BCE Brands PDFs with AI extraction...\n');

  const extractor = new AIPriceExtractionService();

  for (const upload of UPLOAD_IDS) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📄 Processing ${upload.name} pricelist`);
    console.log('='.repeat(80));

    try {
      // Get org_id from supplier
      const supplierResult = await query(
        `
        SELECT org_id FROM core.supplier WHERE supplier_id = $1
      `,
        [SUPPLIER_ID]
      );

      if (supplierResult.rows.length === 0) {
        console.error(`❌ Supplier not found: ${SUPPLIER_ID}`);
        continue;
      }

      const org_id = supplierResult.rows[0].org_id;

      // Read PDF file
      console.log(`📖 Reading PDF file: ${upload.file}`);
      const fileBuffer = readFileSync(upload.file);

      // Extract with AI
      console.log(`🤖 Extracting with AI...`);
      const result = await extractor.extract({
        orgId: org_id,
        supplierId: SUPPLIER_ID,
        fileName: upload.file.split('\\').pop() || upload.file,
        fileBuffer: fileBuffer,
        serviceName: 'BCE Brands Pricelist Extraction',
      });

      console.log(`✅ AI extraction completed: ${result.rows?.length || 0} rows extracted`);

      if (!result.rows || result.rows.length === 0) {
        console.error(`⚠️  No rows extracted from ${upload.name} pricelist`);
        continue;
      }

      // Delete existing invalid rows
      console.log(`🗑️  Deleting existing invalid rows...`);
      await query(
        `
        DELETE FROM spp.pricelist_row WHERE upload_id = $1
      `,
        [upload.id]
      );

      // Map AI extracted rows to pricelist_row format
      console.log(`📝 Mapping extracted rows...`);
      const mappedRows = result.rows.map((row: any, idx: number) => ({
        upload_id: upload.id,
        row_num: idx + 1,
        supplier_sku: row.supplier_sku || row.sku || '',
        name: row.name || row.product_name || '',
        brand: row.brand || undefined,
        uom: row.uom || 'EA',
        pack_size: row.pack_size || undefined,
        price: row.cost_price_ex_vat || row.price || 0,
        cost_price_ex_vat: row.cost_price_ex_vat || row.price || 0,
        price_incl_vat: row.price_incl_vat || undefined,
        vat_rate: row.vat_rate || 0.15,
        currency: row.currency || 'ZAR',
        category_raw: row.category_raw || row.category || undefined,
        stock_on_hand: row.stock_on_hand || 0,
        barcode: row.barcode || undefined,
        attrs_json: {
          cost_excluding: row.cost_price_ex_vat || row.price || 0,
          cost_including: row.price_incl_vat || undefined,
          rsp: row.rsp || row.recommended_retail_price || undefined,
        },
      }));

      // Insert valid rows
      console.log(`💾 Inserting ${mappedRows.length} rows...`);
      const inserted = await pricelistService.insertRows(upload.id, mappedRows);
      console.log(`✅ Inserted ${inserted} rows`);

      // Validate upload
      console.log(`✔️  Validating upload...`);
      const validation = await pricelistService.validateUpload(upload.id);
      console.log(`✅ Validation complete: ${validation.status}`);
      console.log(`   Valid: ${validation.valid_rows}, Invalid: ${validation.invalid_rows}`);

      // Update upload status
      await query(
        `
        UPDATE spp.pricelist_upload 
        SET status = $1, row_count = $2, updated_at = NOW()
        WHERE upload_id = $3
      `,
        [validation.status === 'valid' ? 'validated' : 'warning', mappedRows.length, upload.id]
      );

      console.log(`\n✅ ${upload.name} pricelist reprocessed successfully!`);
    } catch (error) {
      console.error(`❌ Error processing ${upload.name}:`, error);
      if (error instanceof Error) {
        console.error(`   Message: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Reprocessing complete!');
  console.log('='.repeat(80));

  process.exit(0);
}

main().catch(console.error);
