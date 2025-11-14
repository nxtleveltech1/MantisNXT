import { z } from 'zod';

/**
 * Database-backed upload metadata for pricelist processing.
 */
export interface FileUpload {
  upload_id: string;
  supplier_id: string;
  org_id: string;
  file_type: string;
  storage_path: string;
  filename: string;
  file_size: number;
  received_at: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Validation severities used during extraction.
 */
export const ValidationSeveritySchema = z.enum(['warning', 'invalid']);
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;

export const ValidationStatusSchema = z.enum(['valid', 'warning', 'invalid']);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const ValidationIssueSchema = z.object({
  field: z.string(),
  severity: ValidationSeveritySchema,
  message: z.string(),
  value: z.unknown().optional(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const ExtractedProductSchema = z.object({
  row_number: z.number().int().positive(),
  raw_data: z.record(z.string(), z.unknown()),
  supplier_sku: z.string().min(1).max(150),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  currency: z.string().min(1),
  uom: z.string().min(1),
  pack_size: z.number().nonnegative().optional().nullable(),
  category: z.string().optional().nullable(),
  validation_status: ValidationStatusSchema,
  validation_issues: z.array(ValidationIssueSchema).default([]),
  is_duplicate: z.boolean().default(false),
  is_new: z.boolean().default(true),
  matched_product_id: z.string().uuid().optional().nullable(),
});
export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;

export const ExtractionStatsSchema = z.object({
  total_rows: z.number().nonnegative(),
  valid_products: z.number().nonnegative(),
  products_with_warnings: z.number().nonnegative(),
  invalid_products: z.number().nonnegative(),
  new_products: z.number().nonnegative(),
  existing_products: z.number().nonnegative(),
  duplicate_skus: z.number().nonnegative(),
  processing_time_ms: z.number().nonnegative(),
});
export type ExtractionStats = z.infer<typeof ExtractionStatsSchema>;

export interface ExtractionResult {
  job_id: string;
  upload_id: string;
  products: ExtractedProduct[];
  stats: ExtractionStats;
  errors: string[];
  warnings: string[];
  extracted_at: Date;
  expires_at: Date;
}

export interface ExtractionJob {
  job_id: string;
  upload_id: string;
  org_id: string;
  config: ExtractionConfig;
}

export const JobProgressSchema = z.object({
  percent_complete: z.number().min(0).max(100),
  current_step: z.string(),
  rows_processed: z.number().int().nonnegative(),
  rows_total: z.number().int().nonnegative(),
  elapsed_ms: z.number().int().nonnegative(),
  estimated_remaining_ms: z.number().int().nonnegative(),
});
export type JobProgress = z.infer<typeof JobProgressSchema>;

export const JobStatusSchema = z.object({
  job_id: z.string().uuid(),
  upload_id: z.string().uuid(),
  status: z.enum(['queued', 'processing', 'completed', 'failed', 'cancelled']),
  progress: JobProgressSchema.nullable(),
  started_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().nullable().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .nullable()
    .optional(),
});
export type JobStatus = z.infer<typeof JobStatusSchema>;

/**
 * Flexible extraction configuration payload accepted by APIs.
 */
export const ExtractionConfigSchema = z
  .object({
    supplier_id: z.string().uuid().optional(),
    column_mapping: z.record(z.string(), z.string()).optional(),
    auto_detect_columns: z.boolean().optional(),
    skip_rows: z.number().int().nonnegative().optional(),
    delimiter: z.string().optional(),
    encoding: z.string().optional(),
    validation_mode: z.enum(['strict', 'lenient', 'skip_invalid']).optional(),
    currency_default: z.string().length(3).optional(),
    vat_rate: z.number().nonnegative().optional(),
  })
  .catchall(z.unknown());
export type ExtractionConfig = z.infer<typeof ExtractionConfigSchema>;

export const ExtractRequestSchema = z.object({
  upload_id: z.string().uuid(),
  extraction_config: ExtractionConfigSchema,
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;
