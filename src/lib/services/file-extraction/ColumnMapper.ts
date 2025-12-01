/**
 * ColumnMapper - Auto-detect column mappings with fuzzy matching
 *
 * Ported from PriceData with 100+ aliases per field to handle real supplier data.
 * Supports exact and fuzzy matching with comprehensive regional variations.
 */

import type { ColumnMapping, ColumnMappingWithConfidence } from './types';

/**
 * Comprehensive column aliases for auto-detection
 * Supports multiple languages, regional variations, and common misspellings
 */
export const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  supplier_sku: [
    // Standard
    'sku',
    'code',
    'item code',
    'product code',
    'supplier sku',
    'supplier code',
    'part number',
    'part no',
    'article',
    'article code',
    'artikelcode',
    'artikelnr',
    'item',
    'item number',
    'item no',
    'product number',
    'prod code',
    'material',
    'material code',
    'ref',
    'reference',
    'ref code',
    // Variations
    'sku#',
    'sku #',
    'code#',
    'itemcode',
    'productcode',
    'supplier_code',
    'suppliercode',
    'partno',
    'part_number',
    'article_code',
    // Regional
    'código',
    'codigo',
    'artikel',
    'référence',
    'materiaalnummer',
    'stockcode',
    'stock code',
    'stock_code',
    // Common prefixes
    'our code',
    'our sku',
    'vendor code',
    'vendor sku',
  ],

  name: [
    // Standard
    'product',
    'description',
    'item',
    'name',
    'product name',
    'product description',
    'item name',
    'item description',
    'desc',
    'title',
    'artikel naam',
    'artikel beschrijving',
    'omschrijving',
    // Variations
    'product_name',
    'productname',
    'item_name',
    'itemname',
    'product_description',
    'item_description',
    'prod name',
    'prod desc',
    'prod description',
    // Regional
    'descripción',
    'descrição',
    'beschreibung',
    'omschrijving',
    'désignation',
    'libellé',
    'benaming',
  ],

  brand: [
    // Standard
    'brand',
    'manufacturer',
    'make',
    'merk',
    'fabrikant',
    'leverancier',
    'supplier',
    'vendor',
    // Variations
    'brand_name',
    'brandname',
    'manufacturer_name',
    'make_name',
    'mfg',
    'mfr',
    'mfr name',
    'maker',
    // Regional
    'marca',
    'marque',
    'hersteller',
    'tillverkare',
    'produttore',
  ],

  price: [
    // Standard
    'price',
    'cost',
    'unit price',
    'selling price',
    'list price',
    'rrp',
    'retail',
    'nett',
    'net',
    'dealer',
    'trade',
    'wholesale',
    'cost price',
    'costprice',
    // Variations
    'unit_price',
    'unitprice',
    'selling_price',
    'sellingprice',
    'list_price',
    'listprice',
    'sale price',
    'saleprice',
    'our price',
    'your price',
    'customer price',
    // Regional
    'prijs',
    'precio',
    'preço',
    'prix',
    'preis',
    'pris',
    'hinta',
    // Common patterns
    'r price',
    'zar',
    'usd',
    'eur',
    'gbp',
    'verkoop prys',
    'verkoopprys',
    'aankoop prys',
    'aankoopprys',
  ],

  uom: [
    // Standard
    'uom',
    'unit',
    'um',
    'unit of measure',
    'eenheid',
    'qty',
    'quantity',
    'per',
    'unit type',
    'measurement',
    // Variations
    'u/m',
    'u.m',
    'unit_of_measure',
    'unitofmeasure',
    'unit_type',
    'measure',
    'pack',
    'pack type',
    'packtype',
    // Common values (help detect column)
    'each',
    'ea',
    'pcs',
    'unit/carton',
    'units',
    // Regional
    'unidad',
    'unidade',
    'unité',
    'einheit',
    'enhet',
    'yksikkö',
  ],

  pack_size: [
    // Standard
    'pack size',
    'pack qty',
    'pack quantity',
    'carton qty',
    'carton quantity',
    'inner qty',
    'inner quantity',
    'box qty',
    'moq',
    'min order',
    'min qty',
    // Variations
    'packsize',
    'pack_size',
    'packqty',
    'pack_qty',
    'cartonqty',
    'carton_qty',
    'innerqty',
    'inner_qty',
    'boxqty',
    'box_qty',
    'quantity per pack',
    'qty per pack',
    'per pack',
    'perpack',
    // Regional
    'verpakkingsgrootte',
    'verpakking',
    'embalaje',
    'emballage',
    'verpackung',
    'pakkaus',
  ],

  barcode: [
    // Standard
    'barcode',
    'ean',
    'ean13',
    'ean-13',
    'upc',
    'gtin',
    'isbn',
    'code bar',
    'codebar',
    // Variations
    'bar_code',
    'bar code',
    'eancode',
    'ean code',
    'ean_code',
    'upccode',
    'upc code',
    'upc_code',
    'gtincode',
    'gtin code',
    'gtin_code',
    // Regional
    'código de barras',
    'codigo de barras',
    'streepjescode',
    'strichcode',
    'streckod',
    'viivakood',
  ],

  category_raw: [
    // Standard
    'category',
    'cat',
    'product category',
    'item category',
    'group',
    'product group',
    'item group',
    'class',
    'classification',
    'type',
    'product type',
    'item type',
    // Variations
    'category_name',
    'categoryname',
    'cat_name',
    'catname',
    'product_category',
    'productcategory',
    'item_category',
    'itemcategory',
    'grouping',
    'prod group',
    'prodgroup',
    // Regional
    'categorie',
    'categoria',
    'kategorie',
    'categoriën',
    'groupe',
    'grupo',
    'groep',
    'gruppe',
    'ryhmä',
  ],

  vat_code: [
    // Standard
    'vat',
    'vat code',
    'vat rate',
    'tax',
    'tax code',
    'tax rate',
    'btw',
    'gst',
    'sales tax',
    // Variations
    'vat_code',
    'vatcode',
    'vat_rate',
    'vatrate',
    'tax_code',
    'taxcode',
    'tax_rate',
    'taxrate',
    'vat%',
    'tax%',
    // Regional
    'btw code',
    'btw-code',
    'iva',
    'mva',
    'moms',
    'alv',
    'mwst',
    'tva',
  ],
};

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of edits needed to transform s1 into s2
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;

  // Create 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate fuzzy match similarity (0-1) using Levenshtein distance
 * Normalized by the maximum possible distance (longer string length)
 */
export function fuzzyMatch(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1.0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  if (maxLength === 0) return 0;

  // Convert distance to similarity score (0-1)
  return 1 - distance / maxLength;
}

/**
 * Map column headers to standard field names
 * Returns column mapping with confidence scores
 */
export function mapColumns(headers: string[]): ColumnMappingWithConfidence {
  const mapping: ColumnMapping = {
    supplier_sku: null,
    name: null,
    brand: null,
    price: null,
    uom: null,
    pack_size: null,
    barcode: null,
    category_raw: null,
    vat_code: null,
  };

  const confidence: Record<keyof ColumnMapping, number> = {
    supplier_sku: 0,
    name: 0,
    brand: 0,
    price: 0,
    uom: 0,
    pack_size: 0,
    barcode: 0,
    category_raw: 0,
    vat_code: 0,
  };

  const usedHeaders = new Set<string>();

  // Map each field
  for (const field of Object.keys(mapping) as Array<keyof ColumnMapping>) {
    const aliases = COLUMN_ALIASES[field];
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const header of headers) {
      if (usedHeaders.has(header)) continue;

      const headerLower = header.toLowerCase().trim();

      // Check exact match first
      for (const alias of aliases) {
        if (headerLower === alias.toLowerCase()) {
          bestMatch = header;
          bestScore = 1.0;
          break;
        }
      }

      if (bestScore === 1.0) break;

      // Check fuzzy match
      for (const alias of aliases) {
        const score = fuzzyMatch(headerLower, alias);
        if (score > bestScore && score >= 0.8) {
          // 80% similarity threshold
          bestMatch = header;
          bestScore = score;
        }
      }
    }

    if (bestMatch) {
      mapping[field] = bestMatch;
      confidence[field] = bestScore;
      usedHeaders.add(bestMatch);
    }
  }

  // Find unmapped headers
  const unmappedHeaders = headers.filter(h => !usedHeaders.has(h));

  return {
    mapping,
    confidence,
    unmappedHeaders,
  };
}

/**
 * Validate column mapping - check if required fields are mapped
 */
export function validateMapping(mappingResult: ColumnMappingWithConfidence): {
  isValid: boolean;
  missing: string[];
  lowConfidence: Array<{ field: string; confidence: number }>;
} {
  const required: Array<keyof ColumnMapping> = ['supplier_sku', 'name', 'price', 'uom'];

  const missing: string[] = [];
  const lowConfidence: Array<{ field: string; confidence: number }> = [];

  for (const field of required) {
    if (!mappingResult.mapping[field]) {
      missing.push(field);
    } else if (mappingResult.confidence[field] < 0.9) {
      lowConfidence.push({
        field,
        confidence: mappingResult.confidence[field],
      });
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    lowConfidence,
  };
}
