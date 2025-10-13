#!/usr/bin/env tsx

/**
 * Master Dataset Import Script
 *
 * This script imports the master consolidated Excel file into the database
 * using the existing PricelistService workflow.
 *
 * Usage: npx tsx scripts/import_master_dataset.ts
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import { neonDb } from "../lib/database/neon-connection";
import { pricelistService } from "../src/lib/services/PricelistService";
import type {
  PricelistRow,
  Supplier,
  PricelistUploadRequest
} from "../src/types/nxt-spp";

// Configuration constants
const EXCEL_FILE_PATH =
  "K:/00Project/MantisNXT/database/Uploads/FINAL_MASTER_CONSOLIDATED_COMPLETE.xlsx";
const DEFAULT_CURRENCY = "ZAR";
const BATCH_SIZE = 100;
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

interface ImportStats {
  totalSuppliers: number;
  totalProducts: number;
  totalRows: number;
  validationErrors: number;
  mergeResults: {
    created: number;
    updated: number;
  };
  duration: number;
}

interface ColumnMapping {
  supplier_sku: string;
  name: string;
  price: string;
  brand?: string;
  category_raw?: string;
  uom?: string;
  barcode?: string;
}

/**
 * Detect column mappings by inspecting headers
 */
function detectColumnMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    supplier_sku: "",
    name: "",
    price: "",
  };

  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim();

    // SKU/Code mappings
    if (
      ["sku", "code", "item code", "part number", "supplier sku"].includes(
        lowerHeader
      )
    ) {
      mapping.supplier_sku = header;
    }
    // Name mappings
    else if (
      ["name", "description", "product name", "item name", "product"].includes(
        lowerHeader
      )
    ) {
      mapping.name = header;
    }
    // Price mappings
    else if (
      ["price", "unit price", "cost", "selling price", "list price"].includes(
        lowerHeader
      )
    ) {
      mapping.price = header;
    }
    // Brand mappings
    else if (["brand", "manufacturer", "make"].includes(lowerHeader)) {
      mapping.brand = header;
    }
    // Category mappings
    else if (
      ["category", "group", "type", "classification"].includes(lowerHeader)
    ) {
      mapping.category_raw = header;
    }
    // UOM mappings
    else if (
      ["uom", "unit", "unit of measure", "measure"].includes(lowerHeader)
    ) {
      mapping.uom = header;
    }
    // Barcode mappings
    else if (["barcode", "ean", "upc", "gtin"].includes(lowerHeader)) {
      mapping.barcode = header;
    }
  }

  return mapping;
}

/**
 * Ensure supplier exists in database
 */
async function ensureSupplierExists(supplierName: string): Promise<string> {
  try {
    // Check if supplier exists
    const existingSupplier = await neonDb`
      SELECT supplier_id FROM core.supplier 
      WHERE name = ${supplierName} AND active = true
    `;

    if (existingSupplier.length > 0) {
      return existingSupplier[0].supplier_id;
    }

    // Create new supplier
    const newSupplier = await neonDb`
      INSERT INTO core.supplier (name, code, active, default_currency, created_at, updated_at)
      VALUES (${supplierName}, ${supplierName
      .toUpperCase()
      .replace(/\s+/g, "_")}, true, ${DEFAULT_CURRENCY}, NOW(), NOW())
      RETURNING supplier_id
    `;

    console.log(`✓ Created supplier: ${supplierName}`);
    return newSupplier[0].supplier_id;
  } catch (error) {
    console.error(`Error ensuring supplier exists: ${error}`);
    throw error;
  }
}

/**
 * Transform Excel row to PricelistRow format
 */
function transformRowToPricelistRow(
  row: any,
  rowNum: number,
  uploadId: string,
  mapping: ColumnMapping,
  currency: string
): PricelistRow {
  return {
    upload_id: uploadId,
    row_num: rowNum,
    supplier_sku: String(row[mapping.supplier_sku] || "").trim(),
    name: String(row[mapping.name] || "").trim(),
    brand: mapping.brand ? String(row[mapping.brand] || "").trim() : undefined,
    uom: String(row[mapping.uom] || "EACH").trim(),
    pack_size: undefined,
    price:
      parseFloat(String(row[mapping.price] || "0").replace(/[^0-9.-]/g, "")) ||
      0,
    currency: currency,
    category_raw: mapping.category_raw
      ? String(row[mapping.category_raw] || "").trim()
      : undefined,
    vat_code: undefined,
    barcode: mapping.barcode
      ? String(row[mapping.barcode] || "").trim()
      : undefined,
    attrs_json: undefined,
  };
}

/**
 * Main import function
 */
async function importMasterDataset(): Promise<ImportStats> {
  const startTime = Date.now();
  const stats: ImportStats = {
    totalSuppliers: 0,
    totalProducts: 0,
    totalRows: 0,
    validationErrors: 0,
    mergeResults: { created: 0, updated: 0 },
    duration: 0,
  };

  try {
    console.log("🚀 Starting master dataset import...");
    console.log(`📁 Reading file: ${EXCEL_FILE_PATH}`);

    // Check if file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      throw new Error(`Excel file not found: ${EXCEL_FILE_PATH}`);
    }

    // Read Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetArgIndex = process.argv.indexOf("--sheet");
    const targetSheets =
      sheetArgIndex > -1 && process.argv[sheetArgIndex + 1]
        ? [process.argv[sheetArgIndex + 1]]
        : workbook.SheetNames;

    let grandTotalRows = 0;

    for (const sheetName of targetSheets) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      console.log(
        `📊 Found ${jsonData.length} rows in worksheet: ${sheetName}`
      );
      if (jsonData.length === 0) continue;

      // Get headers and detect column mappings
      const headers = Object.keys(jsonData[0]);
      console.log("📋 Headers found:", headers);

      const mapping = detectColumnMappings(headers);
      console.log("🔍 Column mappings detected:", mapping);

      // Validate required mappings
      if (!mapping.supplier_sku || !mapping.name || !mapping.price) {
        throw new Error(
          `Missing required columns. Found: ${JSON.stringify(mapping)}`
        );
      }

      // Group rows by supplier (if supplier column exists, otherwise use default)
      const supplierColumn = headers.find((h) =>
        ["supplier", "vendor", "company"].includes(h.toLowerCase())
      );

      let supplierGroups: { [key: string]: any[] } = {};

      if (supplierColumn) {
        // Group by supplier (exclude brand)
        for (const row of jsonData) {
          const supplierName = String(
            row[supplierColumn] || "Unknown Supplier"
          ).trim();
          if (!supplierGroups[supplierName]) {
            supplierGroups[supplierName] = [];
          }
          supplierGroups[supplierName].push(row);
        }
      } else {
        // Use default supplier
        supplierGroups["Master Supplier"] = jsonData;
      }

      console.log(
        `🏢 Processing ${Object.keys(supplierGroups).length} suppliers`
      );

      // Process each supplier group
      for (const [supplierName, rows] of Object.entries(supplierGroups)) {
        try {
          console.log(
            `\n📦 Processing supplier: ${supplierName} (${rows.length} rows)`
          );

          // Step 1: Ensure supplier exists
          const supplierId = await ensureSupplierExists(supplierName);
          stats.totalSuppliers++;

          // Step 2: Create pricelist upload
          const uploadData: PricelistUploadRequest = {
            supplier_id: supplierId,
            file: Buffer.from(""), // Placeholder - data is in rows
            filename: `master_import_${supplierName}_${
              new Date().toISOString().split("T")[0]
            }.xlsx`,
            currency: DEFAULT_CURRENCY,
            valid_from: new Date(),
          };

          const upload = await pricelistService.createUpload(uploadData);
          console.log(`✓ Created upload: ${upload.upload_id}`);

          // Step 3: Transform rows to PricelistRow format
          const pricelistRows: PricelistRow[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const pricelistRow = transformRowToPricelistRow(
              row,
              i + 1,
              upload.upload_id,
              mapping,
              DEFAULT_CURRENCY
            );

            // Skip rows with missing required data
            if (
              !pricelistRow.supplier_sku ||
              !pricelistRow.name ||
              pricelistRow.price <= 0
            ) {
              console.warn(`⚠️  Skipping row ${i + 1}: missing required data`);
              continue;
            }

            pricelistRows.push(pricelistRow);
          }

          console.log(`✓ Transformed ${pricelistRows.length} valid rows`);

          // Step 4: Insert rows in batches
          for (let i = 0; i < pricelistRows.length; i += BATCH_SIZE) {
            const batch = pricelistRows.slice(i, i + BATCH_SIZE);
            await pricelistService.insertRows(upload.upload_id, batch);

            const progress = Math.round(
              ((i + batch.length) / pricelistRows.length) * 100
            );
            console.log(
              `📊 Progress: ${progress}% (${i + batch.length}/${
                pricelistRows.length
              } rows)`
            );
          }

          // Step 5: Validate upload
          console.log("🔍 Validating upload...");
          const validationResult = await pricelistService.validateUpload(
            upload.upload_id
          );

          if (validationResult.status === "invalid") {
            console.warn(
              `⚠️  Validation failed for ${supplierName}:`,
              validationResult.errors
            );
            stats.validationErrors += validationResult.errors.length;
          } else {
            console.log(`✓ Validation passed for ${supplierName}`);
          }

          // Step 6: Merge pricelist
          console.log("🔄 Merging pricelist...");
          const mergeResult = await pricelistService.mergePricelist(
            upload.upload_id
          );

          if (mergeResult.success) {
            console.log(
              `✓ Merge successful: ${mergeResult.products_created} created, ${mergeResult.products_updated} updated`
            );
            stats.mergeResults.created += mergeResult.products_created;
            stats.mergeResults.updated += mergeResult.products_updated;
          } else {
            console.error(
              `❌ Merge failed for ${supplierName}:`,
              mergeResult.errors
            );
          }

          stats.totalRows += pricelistRows.length;
          stats.totalProducts += pricelistRows.length;
        } catch (error) {
          console.error(`❌ Error processing supplier ${supplierName}:`, error);
          // Continue with next supplier
        }
      }
      grandTotalRows += jsonData.length;
    }

    stats.duration = Date.now() - startTime;

    // Summary report
    console.log("\n🎉 Import completed successfully!");
    console.log("=====================================");
    console.log(`📊 Total suppliers processed: ${stats.totalSuppliers}`);
    console.log(`📦 Total products imported: ${stats.totalProducts}`);
    console.log(`📋 Total rows processed: ${stats.totalRows}`);
    console.log(`⚠️  Validation errors: ${stats.validationErrors}`);
    console.log(`✅ Products created: ${stats.mergeResults.created}`);
    console.log(`🔄 Products updated: ${stats.mergeResults.updated}`);
    console.log(`⏱️  Duration: ${Math.round(stats.duration / 1000)}s`);

    return stats;
  } catch (error) {
    console.error("❌ Import failed:", error);
    throw error;
  }
}

// Command-line execution
if (require.main === module) {
  importMasterDataset()
    .then(() => {
      console.log("\n✅ Master dataset import completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Master dataset import failed:", error);
      process.exit(1);
    });
}

export { importMasterDataset };
