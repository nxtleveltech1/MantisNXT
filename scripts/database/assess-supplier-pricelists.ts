#!/usr/bin/env bun
/**
 * Assess Supplier Pricelist Files
 *
 * Analyzes Excel files for three suppliers:
 * - Musical Distributors
 * - Marshall Music Distributors
 * - AudioSure
 *
 * Checks column alignment, pricing fields, and data quality.
 *
 * Usage:
 *   bun scripts/database/assess-supplier-pricelists.ts
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

interface FileAssessment {
  filePath: string;
  supplierName: string;
  sheetNames: string[];
  headers: string[];
  rowCount: number;
  columnMappings: {
    sku?: string;
    brand?: string;
    name?: string;
    description?: string;
    costExVat?: string;
    costIncVat?: string;
    rsp?: string;
    category?: string;
    stock?: string;
  };
  pricingAnalysis: {
    hasCostExVat: boolean;
    hasCostIncVat: boolean;
    hasRsp: boolean;
    samplePrices: Array<{ sku: string; costExVat?: number; costIncVat?: number; rsp?: number }>;
  };
  issues: string[];
  recommendations: string[];
}

const FILES = [
  {
    path: 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\Musical Distrabutors External Stock 2026-02-04.xlsx',
    supplierName: 'Musical Distributors',
  },
  {
    path: 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\Marshall Music Distrabutors - Extract Ready.xlsx',
    supplierName: 'Marshall Music Distributors',
  },
  {
    path: 'E:\\00Project\\MantisNXT\\.archive\\.uploads\\Audiosure - Extract Ready X.xlsx',
    supplierName: 'AudioSure',
  },
];

/**
 * Normalize price value
 */
function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return isNaN(value) || value <= 0 ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Remove currency symbols and spaces
  let normalized = str.replace(/[R\s,]/g, '');
  
  // Handle European format
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    if (normalized.match(/\d+\s+\d+,\d+/)) {
      normalized = normalized.replace(/\s+/g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(',', '.');
    }
  }

  normalized = normalized.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

/**
 * Find column index by patterns
 */
function findColumn(headers: string[], patterns: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (patterns.some(p => h.includes(p.toLowerCase()))) {
      return i;
    }
  }
  return -1;
}

/**
 * Assess a single Excel file
 */
function assessFile(filePath: string, supplierName: string): FileAssessment {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Assessing: ${supplierName}`);
  console.log(`📁 File: ${filePath}`);
  console.log('='.repeat(80));

  const assessment: FileAssessment = {
    filePath,
    supplierName,
    sheetNames: [],
    headers: [],
    rowCount: 0,
    columnMappings: {},
    pricingAnalysis: {
      hasCostExVat: false,
      hasCostIncVat: false,
      hasRsp: false,
      samplePrices: [],
    },
    issues: [],
    recommendations: [],
  };

  try {
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    assessment.sheetNames = workbook.SheetNames;
    console.log(`\n📊 Found ${workbook.SheetNames.length} sheet(s): ${workbook.SheetNames.join(', ')}`);

    // Process first sheet (or best sheet)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read data
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    }) as unknown[][];

    if (jsonData.length < 2) {
      assessment.issues.push('File has insufficient data rows');
      return assessment;
    }

    // Find header row
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let rowIdx = 0; rowIdx < Math.min(10, jsonData.length); rowIdx++) {
      const row = jsonData[rowIdx] || [];
      const rowHeaders = row
        .map(h => String(h || '').trim())
        .filter(h => h.length > 0);

      const rowText = rowHeaders.join(' ').toLowerCase();
      if (
        (rowText.includes('sku') || rowText.includes('code')) &&
        (rowText.includes('cost') || rowText.includes('price') || rowText.includes('brand'))
      ) {
        headerRowIndex = rowIdx;
        headers = rowHeaders;
        break;
      }
    }

    if (headerRowIndex === -1) {
      assessment.issues.push('Could not identify header row');
      return assessment;
    }

    assessment.headers = headers;
    assessment.rowCount = jsonData.length - headerRowIndex - 1;

    console.log(`\n✅ Header row found at row ${headerRowIndex + 1}`);
    console.log(`📋 Headers (${headers.length} columns):`, headers);
    console.log(`📊 Data rows: ${assessment.rowCount}`);

    // Map columns
    const colSku = findColumn(headers, ['sku', 'code', 'part number', 'item code', 'product code']);
    const colBrand = findColumn(headers, ['brand', 'manufacturer', 'make']);
    const colName = findColumn(headers, ['product name', 'name', 'product', 'item name']);
    const colDescription = findColumn(headers, ['description', 'desc', 'product description']);
    const colCostExVat = findColumn(headers, ['cost ex vat', 'cost exvat', 'cost excluding', 'cost excl', 'ex vat', 'exvat', 'cost ex', 'price ex vat', 'price exvat']);
    const colCostIncVat = findColumn(headers, ['cost inc vat', 'cost incvat', 'cost including', 'cost incl', 'inc vat', 'incvat', 'cost inc', 'price inc vat', 'price incvat']);
    const colRsp = findColumn(headers, ['rsp', 'retail', 'retail price', 'suggested retail', 'list price', 'rrp']);
    const colCategory = findColumn(headers, ['category', 'cat', 'group', 'type', 'class']);
    const colStock = findColumn(headers, ['stock', 'qty', 'quantity', 'qty on hand', 'stock qty', 'available']);

    assessment.columnMappings = {
      sku: colSku >= 0 ? headers[colSku] : undefined,
      brand: colBrand >= 0 ? headers[colBrand] : undefined,
      name: colName >= 0 ? headers[colName] : undefined,
      description: colDescription >= 0 ? headers[colDescription] : undefined,
      costExVat: colCostExVat >= 0 ? headers[colCostExVat] : undefined,
      costIncVat: colCostIncVat >= 0 ? headers[colCostIncVat] : undefined,
      rsp: colRsp >= 0 ? headers[colRsp] : undefined,
      category: colCategory >= 0 ? headers[colCategory] : undefined,
      stock: colStock >= 0 ? headers[colStock] : undefined,
    };

    console.log('\n📊 Column Mappings:');
    console.log(`   SKU: ${assessment.columnMappings.sku || '❌ NOT FOUND'}`);
    console.log(`   Brand: ${assessment.columnMappings.brand || '⚠️  NOT FOUND'}`);
    console.log(`   Name: ${assessment.columnMappings.name || '⚠️  NOT FOUND'}`);
    console.log(`   Description: ${assessment.columnMappings.description || '⚠️  NOT FOUND'}`);
    console.log(`   Cost Ex VAT: ${assessment.columnMappings.costExVat || '❌ NOT FOUND'}`);
    console.log(`   Cost Inc VAT: ${assessment.columnMappings.costIncVat || '❌ NOT FOUND'}`);
    console.log(`   RSP: ${assessment.columnMappings.rsp || '⚠️  NOT FOUND'}`);
    console.log(`   Category: ${assessment.columnMappings.category || '⚠️  NOT FOUND'}`);
    console.log(`   Stock: ${assessment.columnMappings.stock || '⚠️  NOT FOUND'}`);

    // Validate required columns
    if (colSku < 0) {
      assessment.issues.push('SKU column is required but not found');
    }

    if (colCostExVat < 0 && colCostIncVat < 0) {
      assessment.issues.push('Neither Cost Ex VAT nor Cost Inc VAT column found - pricing cannot be determined');
    }

    // Analyze pricing
    assessment.pricingAnalysis.hasCostExVat = colCostExVat >= 0;
    assessment.pricingAnalysis.hasCostIncVat = colCostIncVat >= 0;
    assessment.pricingAnalysis.hasRsp = colRsp >= 0;

    // Sample pricing data (first 5 rows with valid SKU)
    const helper = {
      getFormattedCellValue: (rowIdx: number, colIdx: number): string => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        const cell = worksheet[cellAddress];
        if (!cell) return '';
        return cell.w || String(cell.v || '');
      },
    };

    let samplesCollected = 0;
    for (let rowIdx = headerRowIndex + 1; rowIdx < Math.min(headerRowIndex + 20, jsonData.length); rowIdx++) {
      if (samplesCollected >= 5) break;

      const row = jsonData[rowIdx] || [];
      const sku = colSku >= 0 ? String(row[colSku] || '').trim() : '';
      
      if (!sku) continue;

      const costExVatValue = colCostExVat >= 0
        ? (helper.getFormattedCellValue(rowIdx, colCostExVat) || String(row[colCostExVat] || ''))
        : '';
      const costIncVatValue = colCostIncVat >= 0
        ? (helper.getFormattedCellValue(rowIdx, colCostIncVat) || String(row[colCostIncVat] || ''))
        : '';
      const rspValue = colRsp >= 0
        ? (helper.getFormattedCellValue(rowIdx, colRsp) || String(row[colRsp] || ''))
        : '';

      const costExVat = normalizePrice(costExVatValue);
      const costIncVat = normalizePrice(costIncVatValue);
      const rsp = normalizePrice(rspValue);

      if (costExVat || costIncVat) {
        assessment.pricingAnalysis.samplePrices.push({
          sku,
          costExVat: costExVat || undefined,
          costIncVat: costIncVat || undefined,
          rsp: rsp || undefined,
        });
        samplesCollected++;
      }
    }

    // Generate recommendations
    if (!assessment.columnMappings.sku) {
      assessment.recommendations.push('Add SKU column - required for product identification');
    }

    if (!assessment.columnMappings.costExVat && !assessment.columnMappings.costIncVat) {
      assessment.recommendations.push('Add Cost Ex VAT or Cost Inc VAT column - required for pricing');
    }

    if (assessment.columnMappings.costIncVat && !assessment.columnMappings.costExVat) {
      assessment.recommendations.push('Cost Ex VAT will be calculated from Cost Inc VAT (15% VAT reduction)');
    }

    if (assessment.columnMappings.costExVat && assessment.columnMappings.costIncVat) {
      assessment.recommendations.push('Both Cost Ex VAT and Cost Inc VAT found - will verify consistency');
    }

    if (!assessment.columnMappings.brand) {
      assessment.recommendations.push('Consider adding Brand column for better product categorization');
    }

    // Pricing validation
    if (assessment.pricingAnalysis.samplePrices.length > 0) {
      console.log('\n💰 Sample Pricing Data:');
      assessment.pricingAnalysis.samplePrices.forEach((sample, idx) => {
        console.log(`   ${idx + 1}. ${sample.sku}:`);
        if (sample.costExVat) console.log(`      Cost Ex VAT: R ${sample.costExVat.toFixed(2)}`);
        if (sample.costIncVat) console.log(`      Cost Inc VAT: R ${sample.costIncVat.toFixed(2)}`);
        if (sample.rsp) console.log(`      RSP: R ${sample.rsp.toFixed(2)}`);
        
        // Validate VAT calculation if both present
        if (sample.costExVat && sample.costIncVat) {
          const expectedIncVat = sample.costExVat * 1.15;
          const diff = Math.abs(sample.costIncVat - expectedIncVat);
          if (diff > 0.01) {
            assessment.issues.push(
              `SKU ${sample.sku}: Cost Inc VAT (${sample.costIncVat}) doesn't match Cost Ex VAT * 1.15 (${expectedIncVat.toFixed(2)})`
            );
          }
        }
      });
    }

    // Summary
    console.log('\n📋 Assessment Summary:');
    if (assessment.issues.length > 0) {
      console.log('   ⚠️  Issues:');
      assessment.issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
      console.log('   ✅ No critical issues found');
    }

    if (assessment.recommendations.length > 0) {
      console.log('\n   💡 Recommendations:');
      assessment.recommendations.forEach(rec => console.log(`      - ${rec}`));
    }

    return assessment;
  } catch (error) {
    assessment.issues.push(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return assessment;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Supplier Pricelist Assessment');
  console.log('='.repeat(80));

  const assessments: FileAssessment[] = [];

  for (const file of FILES) {
    try {
      const assessment = assessFile(file.path, file.supplierName);
      assessments.push(assessment);
    } catch (error) {
      console.error(`\n❌ Error assessing ${file.supplierName}:`, error);
    }
  }

  // Final summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 FINAL ASSESSMENT SUMMARY');
  console.log('='.repeat(80));

  assessments.forEach(assessment => {
    console.log(`\n📋 ${assessment.supplierName}:`);
    console.log(`   File: ${assessment.filePath.split('\\').pop()}`);
    console.log(`   Sheets: ${assessment.sheetNames.length}`);
    console.log(`   Data Rows: ${assessment.rowCount}`);
    console.log(`   SKU Column: ${assessment.columnMappings.sku ? '✅' : '❌'}`);
    console.log(`   Cost Ex VAT: ${assessment.columnMappings.costExVat ? '✅' : '❌'}`);
    console.log(`   Cost Inc VAT: ${assessment.columnMappings.costIncVat ? '✅' : '❌'}`);
    console.log(`   Brand Column: ${assessment.columnMappings.brand ? '✅' : '⚠️'}`);
    console.log(`   Issues: ${assessment.issues.length}`);
    console.log(`   Status: ${assessment.issues.length === 0 ? '✅ READY' : '⚠️  NEEDS REVIEW'}`);
  });

  console.log('\n✅ Assessment complete');
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
