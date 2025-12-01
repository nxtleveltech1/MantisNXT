/**
 * ConfidenceScorer - Calculate confidence scores for extraction results
 *
 * Provides row-level and metadata-level confidence scoring based on:
 * - Column mapping quality
 * - Data completeness
 * - Pattern consistency
 * - Validation results
 */

import type { ParsedRow, ColumnMappingWithConfidence, BrandDetectionResult } from './types';

/**
 * Calculate row-level confidence score
 *
 * Factors:
 * - Required fields present (40%)
 * - Optional fields present (20%)
 * - Data quality (20%)
 * - Format consistency (20%)
 */
export function calculateRowConfidence(row: Partial<ParsedRow>): number {
  let score = 0;
  const weights = {
    required: 0.4,
    optional: 0.2,
    quality: 0.2,
    consistency: 0.2,
  };

  // Required fields (40%)
  const requiredFields = ['supplier_sku', 'name', 'uom', 'price', 'currency'];
  const requiredPresent = requiredFields.filter(
    f => row[f as keyof ParsedRow] != null && String(row[f as keyof ParsedRow]).trim().length > 0
  ).length;
  score += (requiredPresent / requiredFields.length) * weights.required;

  // Optional fields (20%)
  const optionalFields = ['brand', 'pack_size', 'barcode', 'category_raw', 'vat_code'];
  const optionalPresent = optionalFields.filter(
    f => row[f as keyof ParsedRow] != null && String(row[f as keyof ParsedRow]).trim().length > 0
  ).length;
  score += (optionalPresent / optionalFields.length) * weights.optional;

  // Data quality (20%)
  let qualityScore = 1.0;

  // Check SKU length and format
  if (row.supplier_sku) {
    const skuLen = row.supplier_sku.length;
    if (skuLen < 2 || skuLen > 100) qualityScore -= 0.2;
  }

  // Check name length and format
  if (row.name) {
    const nameLen = row.name.length;
    if (nameLen < 3 || nameLen > 500) qualityScore -= 0.2;
    if (['test', 'sample', 'n/a'].includes(row.name.toLowerCase())) qualityScore -= 0.3;
  }

  // Check price validity
  if (row.price != null) {
    if (row.price <= 0) qualityScore -= 0.5;
    if (row.price > 1_000_000) qualityScore -= 0.2;
  }

  score += Math.max(0, qualityScore) * weights.quality;

  // Format consistency (20%)
  let consistencyScore = 1.0;

  // Currency format
  if (row.currency && row.currency.length !== 3) consistencyScore -= 0.3;

  // UOM format
  if (row.uom && (row.uom.length === 0 || row.uom.length > 50)) consistencyScore -= 0.2;

  score += Math.max(0, consistencyScore) * weights.consistency;

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate metadata-level confidence score
 *
 * Factors:
 * - Column mapping confidence (40%)
 * - Brand detection confidence (20%)
 * - Data completeness (20%)
 * - Row consistency (20%)
 */
export function calculateMetadataConfidence(
  columnMapping: ColumnMappingWithConfidence,
  brandDetection?: BrandDetectionResult,
  rows?: Array<Partial<ParsedRow>>
): number {
  let score = 0;
  const weights = {
    mapping: 0.4,
    brand: 0.2,
    completeness: 0.2,
    consistency: 0.2,
  };

  // Column mapping confidence (40%)
  const requiredFields: Array<keyof typeof columnMapping.mapping> = [
    'supplier_sku',
    'name',
    'price',
    'uom',
  ];

  let mappingScore = 0;
  let mappedRequired = 0;

  for (const field of requiredFields) {
    if (columnMapping.mapping[field]) {
      mappedRequired++;
      mappingScore += columnMapping.confidence[field];
    }
  }

  if (mappedRequired > 0) {
    mappingScore = mappingScore / requiredFields.length;
  }

  score += mappingScore * weights.mapping;

  // Brand detection confidence (20%)
  if (brandDetection && brandDetection.brand) {
    score += brandDetection.confidence * weights.brand;
  } else {
    // No brand detected - not critical, give partial credit
    score += 0.5 * weights.brand;
  }

  // Data completeness (20%)
  if (rows && rows.length > 0) {
    let completenessScore = 0;
    const sampleSize = Math.min(100, rows.length);
    const sample = rows.slice(0, sampleSize);

    for (const row of sample) {
      const requiredPresent = requiredFields.filter(f => {
        const mapping = columnMapping.mapping[f];
        return mapping && row[mapping as keyof ParsedRow] != null;
      }).length;
      completenessScore += requiredPresent / requiredFields.length;
    }

    completenessScore = completenessScore / sampleSize;
    score += completenessScore * weights.completeness;
  } else {
    // No rows - give partial credit if mapping is good
    score += (mappingScore > 0.8 ? 0.5 : 0) * weights.completeness;
  }

  // Row consistency (20%)
  if (rows && rows.length > 1) {
    let consistencyScore = 1.0;

    // Check currency consistency
    const currencies = new Set(rows.map(r => r.currency).filter(Boolean));
    if (currencies.size > 1) {
      consistencyScore -= 0.3; // Multiple currencies is suspicious
    }

    // Check UOM consistency (should have variety but not too much)
    const uoms = new Set(rows.map(r => r.uom).filter(Boolean));
    const uomRatio = uoms.size / rows.length;
    if (uomRatio > 0.5) {
      consistencyScore -= 0.2; // Too many different UOMs
    }

    // Check brand consistency
    const brands = new Set(rows.map(r => r.brand).filter(Boolean));
    if (brands.size > 10 && rows.length < 100) {
      consistencyScore -= 0.1; // Too many brands for small dataset
    }

    score += Math.max(0, consistencyScore) * weights.consistency;
  } else {
    // Single row or no rows - give partial credit
    score += 0.7 * weights.consistency;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate overall extraction confidence
 *
 * Combines metadata confidence with average row confidence
 */
export function calculateOverallConfidence(
  metadataConfidence: number,
  rows: Array<Partial<ParsedRow>>
): number {
  if (rows.length === 0) {
    return metadataConfidence * 0.5; // Penalize if no rows extracted
  }

  // Calculate average row confidence
  let totalRowConfidence = 0;
  for (const row of rows) {
    totalRowConfidence += calculateRowConfidence(row);
  }
  const avgRowConfidence = totalRowConfidence / rows.length;

  // Weighted average: 60% row quality, 40% metadata quality
  const overall = avgRowConfidence * 0.6 + metadataConfidence * 0.4;

  return Math.max(0, Math.min(1, overall));
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.9) return 'excellent';
  if (confidence >= 0.75) return 'good';
  if (confidence >= 0.6) return 'fair';
  if (confidence >= 0.4) return 'low';
  return 'very low';
}

/**
 * Get confidence level with recommendations
 */
export function getConfidenceReport(confidence: number): {
  level: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
  recommendation: string;
} {
  if (confidence >= 0.9) {
    return {
      level: 'excellent',
      color: 'green',
      recommendation: 'Data is high quality and ready to process',
    };
  }
  if (confidence >= 0.75) {
    return {
      level: 'good',
      color: 'green',
      recommendation: 'Data quality is good with minor issues',
    };
  }
  if (confidence >= 0.6) {
    return {
      level: 'fair',
      color: 'yellow',
      recommendation: 'Review warnings before processing',
    };
  }
  if (confidence >= 0.4) {
    return {
      level: 'low',
      color: 'orange',
      recommendation: 'Significant data quality issues - review carefully',
    };
  }
  return {
    level: 'very low',
    color: 'red',
    recommendation: 'Poor data quality - manual review required',
  };
}
